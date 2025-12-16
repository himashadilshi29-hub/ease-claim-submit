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
    console.log(`Calculating OPD settlement for claim: ${claimId}, user: ${auth.userId}`);

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
      .update({ processing_status: "settlement_pending" })
      .eq("id", claimId);

    // Get all claim data
    const { data: claim } = await supabase
      .from("claims")
      .select("*, policy:policies(*), member:policy_members(*)")
      .eq("id", claimId)
      .single();

    if (!claim) {
      throw new Error("Claim not found");
    }

    // Get validation results
    const { data: validation } = await supabase
      .from("claim_validations")
      .select("*")
      .eq("claim_id", claimId)
      .maybeSingle();

    // Get fraud results
    const { data: fraudResult } = await supabase
      .from("fraud_detection_results")
      .select("*")
      .eq("claim_id", claimId)
      .maybeSingle();

    // Get OCR results for billing items
    const { data: ocrResults } = await supabase
      .from("claim_ocr_results")
      .select("*")
      .eq("claim_id", claimId);

    // Calculate settlement for OPD claims
    const opdLimit = claim.policy?.opd_limit || 0;
    const previousClaimsTotal = validation?.previous_claims_total || 0;
    const remainingCoverage = opdLimit - previousClaimsTotal;
    const validatedBilledTotal = claim.claim_amount || 0;
    const maxPayable = Math.min(remainingCoverage, validatedBilledTotal);
    const coPaymentPercentage = claim.policy?.co_payment_percentage || 0;
    const coPaymentAmount = maxPayable * (coPaymentPercentage / 100);
    const deductible = claim.policy?.deductible_amount || 0;
    const insurerPayment = Math.max(0, maxPayable - coPaymentAmount - deductible);

    // Determine decision based on scores
    const anomalyScore = fraudResult?.anomaly_score || 0.8;
    const fraudScore = fraudResult?.fraud_score || 0.2;
    const validationScore = validation?.overall_validation_score || 0.8;

    let decision = "manual_review";
    let decisionReason = "";

    if (anomalyScore >= 0.9 && fraudScore < 0.3 && validationScore >= 0.8) {
      decision = "auto_approve";
      decisionReason = "All OPD validation checks passed with high confidence. No fraud indicators detected.";
    } else if (fraudScore >= 0.7 || validationScore < 0.5) {
      decision = "reject";
      decisionReason = fraudScore >= 0.7 
        ? "High fraud risk detected - claim flagged for investigation" 
        : "Validation score too low - multiple OPD validation points failed";
    } else {
      decision = "manual_review";
      decisionReason = "Borderline scores require human review. This claim will be routed to IBPS for standard claim flow.";
    }

    // Extract covered and non-covered items from OCR
    const coveredItems: any[] = [];
    const nonCoveredItems: any[] = [];
    
    ocrResults?.forEach(result => {
      try {
        const rawText = result.raw_text;
        const parsedData = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        const entities = parsedData?.entities || result.extracted_entities;
        
        if (entities?.billing?.items) {
          entities.billing.items.forEach((item: any) => {
            const itemName = typeof item === 'string' ? item : item.description;
            const itemAmount = typeof item === 'object' ? item.amount : 0;
            const lowerItem = itemName?.toLowerCase() || '';
            
            if (lowerItem.includes('vitamin') || lowerItem.includes('cosmetic') || 
                lowerItem.includes('supplement') || lowerItem.includes('beauty')) {
              nonCoveredItems.push({ description: itemName, amount: itemAmount, reason: 'Excluded item' });
            } else {
              coveredItems.push({ description: itemName, amount: itemAmount });
            }
          });
        }
        
        if (entities?.medicines) {
          entities.medicines.forEach((med: any) => {
            if (med.is_vitamin || med.is_cosmetic || !med.is_covered) {
              nonCoveredItems.push({ 
                description: med.name, 
                amount: 0, 
                reason: med.is_vitamin ? 'Vitamin - not covered' : 
                        med.is_cosmetic ? 'Cosmetic - not covered' : 'Not covered under policy'
              });
            }
          });
        }
      } catch (e) {
        console.error("Error parsing OCR result:", e);
      }
    });

    // Generate AI summary
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are an OPD insurance claim settlement expert for Janashakthi Insurance. Generate a professional, concise summary of the settlement decision.
            
Include:
1. Brief claim overview
2. Key validation findings
3. Exclusions applied (if any)
4. Settlement calculation breakdown
5. Final recommendation

Keep the summary professional and suitable for claim documentation.` 
          },
          { 
            role: "user", 
            content: `Generate an OPD settlement summary for claim ${claim.reference_number}:

Claimant: ${claim.member?.member_name || 'Unknown'}
Claim Type: ${claim.claim_type}
Diagnosis: ${claim.diagnosis || 'Not specified'}
Date of Treatment: ${claim.date_of_treatment || 'Not specified'}

Financial Summary:
- Claim Amount: LKR ${validatedBilledTotal.toLocaleString()}
- OPD Policy Limit: LKR ${opdLimit.toLocaleString()}
- Previous Claims Used: LKR ${previousClaimsTotal.toLocaleString()}
- Remaining Coverage: LKR ${remainingCoverage.toLocaleString()}
- Co-payment (${coPaymentPercentage}%): LKR ${coPaymentAmount.toLocaleString()}
- Deductible: LKR ${deductible.toLocaleString()}
- Insurer Payment: LKR ${insurerPayment.toLocaleString()}

Validation Results:
- Overall Validation Score: ${(validationScore * 100).toFixed(1)}%
- Anomaly Score: ${(anomalyScore * 100).toFixed(1)}%
- Fraud Score: ${(fraudScore * 100).toFixed(1)}%

Excluded Items: ${nonCoveredItems.length > 0 ? nonCoveredItems.map(i => i.description).join(', ') : 'None'}

Decision: ${decision.replace('_', ' ').toUpperCase()}
Reason: ${decisionReason}` 
          },
        ],
      }),
    });

    let aiSummary = "";
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiSummary = aiData.choices?.[0]?.message?.content || "";
    }

    // Store settlement calculation
    const { error: settlementError } = await supabase.from("settlement_calculations").upsert({
      claim_id: claimId,
      validated_billed_total: validatedBilledTotal,
      covered_items: coveredItems,
      non_covered_items: nonCoveredItems,
      policy_limit: opdLimit,
      previous_claims_total: previousClaimsTotal,
      remaining_coverage: remainingCoverage,
      max_payable_amount: maxPayable,
      co_payment_percentage: coPaymentPercentage,
      co_payment_amount: coPaymentAmount,
      deductible_amount: deductible,
      insurer_payment: insurerPayment,
      decision: decision,
      decision_reason: decisionReason,
      settlement_date: decision === "auto_approve" ? new Date().toISOString() : null,
      approval_letter_generated: decision === "auto_approve",
    }, { onConflict: 'claim_id' });

    if (settlementError) {
      console.error("Error storing settlement:", settlementError);
    }

    // Update claim with final status
    let finalProcessingStatus = "manual_review";
    let claimStatus = "pending";
    
    if (decision === "auto_approve") {
      finalProcessingStatus = "auto_approved";
      claimStatus = "approved";
    } else if (decision === "reject") {
      finalProcessingStatus = "auto_rejected";
      claimStatus = "rejected";
    } else {
      finalProcessingStatus = "manual_review";
      claimStatus = "manual-review";
    }

    await supabase
      .from("claims")
      .update({ 
        processing_status: finalProcessingStatus,
        status: claimStatus,
        approved_amount: decision === "auto_approve" ? insurerPayment : null,
        settled_amount: decision === "auto_approve" ? insurerPayment : null,
        ai_summary: aiSummary,
      })
      .eq("id", claimId);

    // Add to claim history
    await supabase.from("claim_history").insert([{
      claim_id: claimId,
      action: `AI ${decision.replace('_', ' ')}`,
      previous_status: "pending" as const,
      new_status: claimStatus as any,
      notes: aiSummary || decisionReason,
    }]);

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      settlement: {
        validated_billed_total: validatedBilledTotal,
        opd_limit: opdLimit,
        remaining_coverage: remainingCoverage,
        max_payable: maxPayable,
        co_payment: coPaymentAmount,
        deductible: deductible,
        insurer_payment: insurerPayment,
        covered_items: coveredItems,
        non_covered_items: nonCoveredItems,
        decision: decision,
        decision_reason: decisionReason,
      },
      scores: {
        validation_score: validationScore,
        anomaly_score: anomalyScore,
        fraud_score: fraudScore
      },
      ai_summary: aiSummary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calculating settlement:", error);
    return new Response(JSON.stringify({ error: "Settlement calculation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});