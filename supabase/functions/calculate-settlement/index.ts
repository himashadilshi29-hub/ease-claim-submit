import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claimId } = await req.json();
    console.log(`Calculating settlement for claim: ${claimId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update processing status
    await supabase
      .from("claims")
      .update({ processing_status: "settlement_pending" })
      .eq("id", claimId);

    // Get all claim data
    const { data: claim } = await supabase
      .from("claims")
      .select("*, policy:policies(*)")
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
      .single();

    // Get fraud results
    const { data: fraudResult } = await supabase
      .from("fraud_detection_results")
      .select("*")
      .eq("claim_id", claimId)
      .single();

    // Get OCR results for billing items
    const { data: ocrResults } = await supabase
      .from("claim_ocr_results")
      .select("*")
      .eq("claim_id", claimId);

    // Calculate settlement
    const policyLimit = claim.claim_type === 'hospitalization' 
      ? (claim.policy?.hospitalization_limit || 0)
      : (claim.policy?.opd_limit || 0);
    
    const previousClaimsTotal = validation?.previous_claims_total || 0;
    const remainingCoverage = policyLimit - previousClaimsTotal;
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
      decisionReason = "All validation checks passed with high confidence";
    } else if (fraudScore >= 0.7 || validationScore < 0.5) {
      decision = "reject";
      decisionReason = fraudScore >= 0.7 
        ? "High fraud risk detected" 
        : "Validation score too low";
    } else {
      decision = "manual_review";
      decisionReason = "Borderline scores require human review";
    }

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
            content: "You are an insurance claim settlement expert. Generate a concise summary of the settlement decision." 
          },
          { 
            role: "user", 
            content: `Generate a settlement summary for claim ${claim.reference_number}:
            - Claim Amount: LKR ${validatedBilledTotal}
            - Policy Limit: LKR ${policyLimit}
            - Remaining Coverage: LKR ${remainingCoverage}
            - Co-payment: ${coPaymentPercentage}% (LKR ${coPaymentAmount})
            - Insurer Payment: LKR ${insurerPayment}
            - Decision: ${decision}
            - Reason: ${decisionReason}
            - Anomaly Score: ${anomalyScore}
            - Fraud Score: ${fraudScore}
            - Validation Score: ${validationScore}` 
          },
        ],
      }),
    });

    let aiSummary = "";
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiSummary = aiData.choices?.[0]?.message?.content || "";
    }

    // Extract covered and non-covered items from OCR
    const coveredItems: string[] = [];
    const nonCoveredItems: string[] = [];
    
    ocrResults?.forEach(result => {
      const entities = result.extracted_entities as any;
      if (entities?.billing?.items) {
        entities.billing.items.forEach((item: string) => {
          const lowerItem = item.toLowerCase();
          if (lowerItem.includes('vitamin') || lowerItem.includes('cosmetic')) {
            nonCoveredItems.push(item);
          } else {
            coveredItems.push(item);
          }
        });
      }
    });

    // Store settlement calculation
    const { error: settlementError } = await supabase.from("settlement_calculations").upsert({
      claim_id: claimId,
      validated_billed_total: validatedBilledTotal,
      covered_items: coveredItems,
      non_covered_items: nonCoveredItems,
      policy_limit: policyLimit,
      previous_claims_total: previousClaimsTotal,
      remaining_coverage: remainingCoverage,
      max_payable_amount: maxPayable,
      co_payment_percentage: coPaymentPercentage,
      co_payment_amount: coPaymentAmount,
      deductible_amount: deductible,
      insurer_payment: insurerPayment,
      decision: decision,
      decision_reason: decisionReason,
    }, { onConflict: 'claim_id' });

    if (settlementError) {
      console.error("Error storing settlement:", settlementError);
    }

    // Update claim with final status
    let finalStatus = "manual_review";
    let claimStatus = "pending";
    
    if (decision === "auto_approve") {
      finalStatus = "auto_approved";
      claimStatus = "approved";
    } else if (decision === "reject") {
      finalStatus = "auto_rejected";
      claimStatus = "rejected";
    }

    await supabase
      .from("claims")
      .update({ 
        processing_status: finalStatus,
        status: claimStatus,
        approved_amount: decision === "auto_approve" ? insurerPayment : null,
        settled_amount: decision === "auto_approve" ? insurerPayment : null,
        ai_summary: aiSummary,
      })
      .eq("id", claimId);

    // Add to claim history
    await supabase.from("claim_history").insert({
      claim_id: claimId,
      action: `AI ${decision.replace('_', ' ')}`,
      previous_status: "pending",
      new_status: claimStatus,
      notes: aiSummary || decisionReason,
    });

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      settlement: {
        validated_billed_total: validatedBilledTotal,
        policy_limit: policyLimit,
        remaining_coverage: remainingCoverage,
        max_payable: maxPayable,
        co_payment: coPaymentAmount,
        deductible: deductible,
        insurer_payment: insurerPayment,
        decision: decision,
        decision_reason: decisionReason,
      },
      ai_summary: aiSummary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calculating settlement:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
