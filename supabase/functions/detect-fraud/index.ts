import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Input validation schema
const requestSchema = z.object({
  claimId: z.string().uuid("Invalid claim ID format"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      console.log("Authentication failed:", auth.error);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      console.log("Validation failed:", parseResult.error.errors);
      return new Response(JSON.stringify({ 
        error: "Invalid request format", 
        details: parseResult.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claimId } = parseResult.data;
    console.log(`Running OPD fraud detection for claim: ${claimId}, user: ${auth.userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify user has access to this claim
    if (!auth.isAdmin && !auth.isBranch) {
      const { data: claim } = await supabase
        .from("claims")
        .select("user_id")
        .eq("id", claimId)
        .maybeSingle();
      
      if (!claim || claim.user_id !== auth.userId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update processing status
    await supabase
      .from("claims")
      .update({ processing_status: "fraud_check_in_progress" })
      .eq("id", claimId);

    // Get claim details
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("*, policy:policies(*), member:policy_members(*)")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      throw new Error("Claim not found");
    }

    // Get OCR results
    const { data: ocrResults } = await supabase
      .from("claim_ocr_results")
      .select("*")
      .eq("claim_id", claimId);

    // Get claim documents for hash comparison
    const { data: documents } = await supabase
      .from("claim_documents")
      .select("*")
      .eq("claim_id", claimId);

    // Get historical OPD claims for baseline comparison
    const { data: historicalClaims } = await supabase
      .from("claims")
      .select("*, claim_documents(*)")
      .in("claim_type", ["opd", "dental", "spectacles"])
      .neq("id", claimId)
      .order("created_at", { ascending: false })
      .limit(200);

    // Check for potential duplicates
    const { data: potentialDuplicates } = await supabase
      .from("claims")
      .select("id, reference_number, claim_amount, diagnosis, hospital_name, date_of_treatment, created_at")
      .neq("id", claimId)
      .eq("policy_id", claim.policy_id)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    // Check claims from same provider
    const { data: providerClaims } = await supabase
      .from("claims")
      .select("id, claim_amount, created_at")
      .eq("hospital_name", claim.hospital_name)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Calculate historical baselines
    const opdClaims = historicalClaims?.filter(c => c.claim_type === 'opd') || [];
    const avgClaimAmount = opdClaims.reduce((sum, c) => sum + (c.claim_amount || 0), 0) / (opdClaims.length || 1);
    const stdDevAmount = Math.sqrt(
      opdClaims.reduce((sum, c) => sum + Math.pow((c.claim_amount || 0) - avgClaimAmount, 2), 0) / (opdClaims.length || 1)
    );

    const amountDeviation = avgClaimAmount > 0 
      ? ((claim.claim_amount - avgClaimAmount) / avgClaimAmount) * 100 
      : 0;

    const systemPrompt = `You are an expert OPD insurance fraud detection system for Janashakthi Insurance in Sri Lanka.

Analyze this OPD claim for potential fraud indicators:

1. DUPLICATE DETECTION (Policy-Level):
   - Hash-Based: Check if same documents were submitted before
   - Content-Based: Check for same bill amounts, hospitals, procedures
   - Similar claims from same policy in short timeframe
   
2. ANOMALY DETECTION:
   - Compare claim amount to historical average (Avg: LKR ${avgClaimAmount.toFixed(2)}, StdDev: LKR ${stdDevAmount.toFixed(2)})
   - Amount deviation: ${amountDeviation.toFixed(2)}%
   - Check for unusual patterns in billing
   
3. CONTENT VERIFICATION:
   - Verify consistency between prescription and bill
   - Check for altered or suspicious content
   - Look for inconsistencies in dates, names, amounts
   
4. PROVIDER ANALYSIS:
   - Frequency of claims from same hospital: ${providerClaims?.length || 0} claims in last 30 days
   - Check for inflated consultation fees
   - Verify legitimacy of channelling bills

5. OPD-SPECIFIC CHECKS:
   - Multiple OPD claims for same ailment
   - Unusually high medicine quantities
   - Cosmetic items disguised as medical
   - Vitamins/supplements billed as medicines

Current Claim:
- Amount: LKR ${claim.claim_amount}
- Diagnosis: ${claim.diagnosis || 'Not specified'}
- Hospital: ${claim.hospital_name || 'Not specified'}
- Doctor: ${claim.doctor_name || 'Not specified'}
- Date of Treatment: ${claim.date_of_treatment || 'Not specified'}
- Member: ${claim.member?.member_name || 'Unknown'}

Potential Duplicates Found:
${JSON.stringify(potentialDuplicates?.map(d => ({
  ref: d.reference_number,
  amount: d.claim_amount,
  diagnosis: d.diagnosis,
  date: d.date_of_treatment
})) || [], null, 2)}

OCR Extracted Data:
${JSON.stringify(ocrResults?.map(r => ({
  type: r.document_type,
  confidence: r.ocr_confidence,
  entities: r.extracted_entities,
  validation_flags: (r.raw_text ? JSON.parse(r.raw_text as string) : {}).validation_flags
})) || [], null, 2)}

Historical Baseline (OPD Claims):
- Total OPD claims in database: ${opdClaims.length}
- Average Claim Amount: LKR ${avgClaimAmount.toFixed(2)}
- Standard Deviation: LKR ${stdDevAmount.toFixed(2)}
- Current claim is ${amountDeviation > 0 ? 'above' : 'below'} average by ${Math.abs(amountDeviation).toFixed(2)}%

Fraud Detection Thresholds:
- Similarity ≥ 90%: Flag as potential duplicate
- Amount > Avg + 3σ: Flag as inflated
- Provider frequency > 10 claims/month: Flag for investigation`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analyze this OPD claim for fraud indicators and provide detailed scoring with workflow recommendation." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_opd_fraud",
              description: "Detect potential fraud in OPD insurance claim",
              parameters: {
                type: "object",
                properties: {
                  duplicate_hash_match: { type: "boolean" },
                  duplicate_content_match: { type: "boolean" },
                  duplicate_similarity_score: { type: "number", minimum: 0, maximum: 1 },
                  duplicate_claim_ids: { type: "array", items: { type: "string" } },
                  anomaly_score: { type: "number", minimum: 0, maximum: 1 },
                  fraud_score: { type: "number", minimum: 0, maximum: 1 },
                  alerts: { type: "array", items: { type: "string" } },
                  amount_deviation_percentage: { type: "number" },
                  provider_claim_frequency: { type: "integer" },
                  opd_specific_flags: {
                    type: "object",
                    properties: {
                      multiple_claims_same_ailment: { type: "boolean" },
                      high_medicine_quantity: { type: "boolean" },
                      cosmetics_as_medical: { type: "boolean" },
                      vitamins_as_medicine: { type: "boolean" },
                      inflated_consultation_fee: { type: "boolean" },
                      prescription_bill_mismatch: { type: "boolean" }
                    }
                  },
                  historical_baseline: {
                    type: "object",
                    properties: {
                      avg_amount: { type: "number" },
                      std_dev: { type: "number" },
                      percentile: { type: "number" },
                      is_outlier: { type: "boolean" }
                    }
                  },
                  llm_analysis: { type: "string" },
                  workflow_action: { type: "string", enum: ["auto_approve", "manual_review", "escalate", "reject"] }
                },
                required: ["anomaly_score", "fraud_score", "workflow_action"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "detect_opd_fraud" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI fraud detection error:", await aiResponse.text());
      throw new Error("Fraud detection failed");
    }

    const aiData = await aiResponse.json();
    let fraudResult;
    
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        fraudResult = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("No tool call response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      fraudResult = {
        anomaly_score: 0.8,
        fraud_score: 0.3,
        alerts: ["Fraud detection parsing failed - manual review required"],
        workflow_action: "manual_review"
      };
    }

    // Store fraud detection results
    const { error: fraudError } = await supabase.from("fraud_detection_results").upsert({
      claim_id: claimId,
      duplicate_hash_match: fraudResult.duplicate_hash_match || false,
      duplicate_content_match: fraudResult.duplicate_content_match || false,
      duplicate_similarity_score: fraudResult.duplicate_similarity_score || 0,
      duplicate_claim_ids: fraudResult.duplicate_claim_ids || [],
      anomaly_score: fraudResult.anomaly_score,
      fraud_score: fraudResult.fraud_score,
      alerts: fraudResult.alerts || [],
      amount_deviation_percentage: fraudResult.amount_deviation_percentage || amountDeviation,
      provider_claim_frequency: providerClaims?.length || 0,
      historical_baseline: {
        avg_amount: avgClaimAmount,
        std_dev: stdDevAmount,
        opd_specific_flags: fraudResult.opd_specific_flags,
        ...fraudResult.historical_baseline
      },
      llm_analysis: fraudResult.llm_analysis || "",
      workflow_action: fraudResult.workflow_action,
    }, { onConflict: 'claim_id' });

    if (fraudError) {
      console.error("Error storing fraud results:", fraudError);
    }

    // Update claim with fraud scores
    const riskLevel = fraudResult.fraud_score >= 0.7 ? 'high' : fraudResult.fraud_score >= 0.4 ? 'medium' : 'low';
    const fraudStatus = fraudResult.fraud_score >= 0.7 ? 'flagged' : fraudResult.fraud_score >= 0.4 ? 'suspicious' : 'clean';

    await supabase
      .from("claims")
      .update({ 
        processing_status: "fraud_check_complete",
        fraud_flags: Math.round(fraudResult.fraud_score * 10),
        risk_score: Math.round((1 - fraudResult.anomaly_score) * 100),
        risk_level: riskLevel,
        fraud_status: fraudStatus,
      })
      .eq("id", claimId);

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      fraud_result: {
        ...fraudResult,
        provider_claim_frequency: providerClaims?.length || 0,
        potential_duplicates_count: potentialDuplicates?.length || 0
      },
      historical_baseline: {
        avg_amount: avgClaimAmount,
        std_dev: stdDevAmount,
        total_opd_claims: opdClaims.length
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fraud detection:", error);
    return new Response(JSON.stringify({ error: "Fraud detection failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});