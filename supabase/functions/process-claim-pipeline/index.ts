import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Input validation schema
const requestSchema = z.object({
  claimId: z.string().uuid("Invalid claim ID format"),
});

// Helper to get CORS headers with origin validation
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
  const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.includes("lovable.dev") || origin.includes("localhost");
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin || "*" : (allowedOrigins[0] || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Generate request ID for error tracking
function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

async function verifyAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; isAdmin?: boolean; isBranch?: boolean; error?: string }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing authorization" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  if (token === SUPABASE_SERVICE_ROLE_KEY || token === SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL!, token, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { authenticated: false, error: "Invalid token" };
    }
    
    const serviceSupabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: roleData } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    return {
      authenticated: true,
      userId: user.id,
      isAdmin: roleData?.role === "admin",
      isBranch: roleData?.role === "branch",
    };
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { authenticated: false, error: "Invalid or expired token" };
  }

  const serviceSupabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  const { data: roleData } = await serviceSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    authenticated: true,
    userId: user.id,
    isAdmin: roleData?.role === "admin",
    isBranch: roleData?.role === "branch",
  };
}

// This function orchestrates the entire claim processing pipeline
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      console.log(`[${requestId}] Authentication failed`);
      return new Response(JSON.stringify({ error: "Unauthorized", request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      console.log(`[${requestId}] Validation failed:`, parseResult.error.errors);
      return new Response(JSON.stringify({ 
        error: "Invalid request format",
        request_id: requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claimId } = parseResult.data;
    console.log(`[${requestId}] Starting claim processing pipeline for: ${claimId}, user: ${auth.userId}`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify user has access to this claim
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("*, claim_documents(*)")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      throw new Error("Claim not found");
    }

    // Check access permissions
    if (!auth.isAdmin && !auth.isBranch && claim.user_id !== auth.userId) {
      return new Response(JSON.stringify({ error: "Access denied", request_id: requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Found claim ${claim.reference_number} with ${claim.claim_documents?.length || 0} documents`);

    // Get the auth header to pass to sub-functions
    const authHeader = req.headers.get("Authorization") || "";

    const pipelineResults = {
      ocr: [] as any[],
      validation: null as any,
      fraud: null as any,
      settlement: null as any,
    };

    // Step 1: Process each document with OCR
    console.log(`[${requestId}] Step 1: Processing documents with OCR...`);
    for (const doc of claim.claim_documents || []) {
      try {
        const ocrResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-claim-document`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            claimId: claimId,
            documentId: doc.id,
            fileUrl: doc.file_path,
            claimType: claim.claim_type,
          }),
        });

        if (ocrResponse.ok) {
          const ocrResult = await ocrResponse.json();
          pipelineResults.ocr.push(ocrResult);
          console.log(`[${requestId}] OCR completed for document ${doc.id}: confidence ${ocrResult.ocr_result?.ocr_confidence || 0}%`);
        } else {
          console.error(`[${requestId}] OCR failed for document ${doc.id}`);
        }
      } catch (ocrError) {
        console.error(`[${requestId}] OCR failed for document ${doc.id}:`, ocrError);
      }
    }

    // Check if any documents need reupload
    const lowConfidenceDocs = pipelineResults.ocr.filter(r => r.status === "reupload_required");
    if (lowConfidenceDocs.length > 0) {
      console.log(`[${requestId}] ${lowConfidenceDocs.length} documents require reupload`);
      await supabase
        .from("claims")
        .update({ processing_status: "reupload_required" })
        .eq("id", claimId);
      
      return new Response(JSON.stringify({
        success: false,
        status: "reupload_required",
        message: `${lowConfidenceDocs.length} document(s) have low OCR confidence and need to be reuploaded`,
        documents_needing_reupload: lowConfidenceDocs.map(d => d.document_id),
        request_id: requestId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate claim
    console.log(`[${requestId}] Step 2: Validating claim...`);
    try {
      const validationResponse = await fetch(`${SUPABASE_URL}/functions/v1/validate-claim`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimId }),
      });

      if (validationResponse.ok) {
        pipelineResults.validation = await validationResponse.json();
        console.log(`[${requestId}] Validation completed: score ${pipelineResults.validation?.validation_result?.overall_validation_score || 0}`);
      } else {
        console.error(`[${requestId}] Validation failed`);
      }
    } catch (validationError) {
      console.error(`[${requestId}] Validation failed:`, validationError);
    }

    // Step 3: Fraud detection
    console.log(`[${requestId}] Step 3: Running fraud detection...`);
    try {
      const fraudResponse = await fetch(`${SUPABASE_URL}/functions/v1/detect-fraud`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimId }),
      });

      if (fraudResponse.ok) {
        pipelineResults.fraud = await fraudResponse.json();
        console.log(`[${requestId}] Fraud detection completed: score ${pipelineResults.fraud?.fraud_result?.fraud_score || 0}`);
      } else {
        console.error(`[${requestId}] Fraud detection failed`);
      }
    } catch (fraudError) {
      console.error(`[${requestId}] Fraud detection failed:`, fraudError);
    }

    // Step 4: Calculate settlement
    console.log(`[${requestId}] Step 4: Calculating settlement...`);
    try {
      const settlementResponse = await fetch(`${SUPABASE_URL}/functions/v1/calculate-settlement`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimId }),
      });

      if (settlementResponse.ok) {
        pipelineResults.settlement = await settlementResponse.json();
        console.log(`[${requestId}] Settlement calculated: decision ${pipelineResults.settlement?.settlement?.decision}`);
      } else {
        console.error(`[${requestId}] Settlement calculation failed`);
      }
    } catch (settlementError) {
      console.error(`[${requestId}] Settlement calculation failed:`, settlementError);
    }

    // Generate final summary
    const finalDecision = pipelineResults.settlement?.settlement?.decision || "manual_review";
    const finalAmount = pipelineResults.settlement?.settlement?.insurer_payment || 0;

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      reference_number: claim.reference_number,
      pipeline_results: {
        ocr_documents_processed: pipelineResults.ocr.length,
        validation_score: pipelineResults.validation?.validation_result?.overall_validation_score,
        fraud_score: pipelineResults.fraud?.fraud_result?.fraud_score,
        anomaly_score: pipelineResults.fraud?.fraud_result?.anomaly_score,
        decision: finalDecision,
        insurer_payment: finalAmount,
      },
      full_results: pipelineResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Pipeline error:`, error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request", request_id: requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
