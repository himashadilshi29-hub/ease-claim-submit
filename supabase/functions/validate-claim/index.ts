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
    console.log(`Validating claim: ${claimId}`);

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
      .update({ processing_status: "validation_in_progress" })
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

    // Get OCR results for this claim
    const { data: ocrResults } = await supabase
      .from("claim_ocr_results")
      .select("*")
      .eq("claim_id", claimId);

    // Get medicine database for validation
    const { data: medicines } = await supabase
      .from("medicine_database")
      .select("*");

    // Get disease-medicine mappings
    const { data: diseaseMappings } = await supabase
      .from("disease_medicine_mapping")
      .select("*");

    // Get previous claims for this policy/member
    const { data: previousClaims } = await supabase
      .from("claims")
      .select("claim_amount, approved_amount, claim_type")
      .eq("policy_id", claim.policy_id)
      .eq("status", "approved")
      .neq("id", claimId);

    const previousClaimsTotal = previousClaims?.reduce((sum, c) => sum + (c.approved_amount || 0), 0) || 0;

    // Prepare validation prompt
    const systemPrompt = `You are an expert insurance claim validator for Janashakthi Insurance in Sri Lanka.
Validate the claim based on:
1. Policy coverage and limits
2. Member eligibility
3. Document completeness
4. Medicine-diagnosis relevance
5. Billing accuracy
6. Exclusions (vitamins, cosmetics, non-covered treatments)

Policy Details:
- Type: ${claim.policy?.policy_type || 'retail'}
- Hospitalization Limit: ${claim.policy?.hospitalization_limit || 0}
- OPD Limit: ${claim.policy?.opd_limit || 0}
- Co-payment: ${claim.policy?.co_payment_percentage || 0}%
- Room Category: ${claim.policy?.room_category || 'General Ward'}
- Exclusions: ${JSON.stringify(claim.policy?.exclusions || [])}

Claim Details:
- Type: ${claim.claim_type}
- Amount: ${claim.claim_amount}
- Diagnosis: ${claim.diagnosis || 'Not specified'}
- Previous Claims Total: ${previousClaimsTotal}

OCR Extracted Data: ${JSON.stringify(ocrResults?.map(r => r.extracted_entities) || [])}

Medicine Database: ${JSON.stringify(medicines?.slice(0, 20) || [])}
Disease Mappings: ${JSON.stringify(diseaseMappings || [])}

Return validation results with scoring.`;

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
          { role: "user", content: "Validate this insurance claim and provide detailed scoring." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_claim",
              description: "Validate insurance claim and return scores",
              parameters: {
                type: "object",
                properties: {
                  detected_claim_type: { type: "string", enum: ["opd", "hospitalization", "dental", "spectacles"] },
                  policy_verified: { type: "boolean" },
                  member_verified: { type: "boolean" },
                  mandatory_documents_status: {
                    type: "object",
                    properties: {
                      claim_form: { type: "boolean" },
                      prescription: { type: "boolean" },
                      medical_bill: { type: "boolean" },
                      diagnosis_card: { type: "boolean" },
                      admission_card: { type: "boolean" }
                    }
                  },
                  missing_documents: { type: "array", items: { type: "string" } },
                  coverage_details: {
                    type: "object",
                    properties: {
                      policy_limit: { type: "number" },
                      available_limit: { type: "number" },
                      covered_items: { type: "array", items: { type: "string" } },
                      excluded_items: { type: "array", items: { type: "string" } }
                    }
                  },
                  exclusions_found: { type: "array", items: { type: "string" } },
                  previous_claims_total: { type: "number" },
                  remaining_coverage: { type: "number" },
                  max_payable_amount: { type: "number" },
                  co_payment_amount: { type: "number" },
                  prescription_diagnosis_score: { type: "number", minimum: 0, maximum: 1 },
                  prescription_bill_score: { type: "number", minimum: 0, maximum: 1 },
                  diagnosis_treatment_score: { type: "number", minimum: 0, maximum: 1 },
                  billing_policy_score: { type: "number", minimum: 0, maximum: 1 },
                  overall_validation_score: { type: "number", minimum: 0, maximum: 1 },
                  validation_issues: { type: "array", items: { type: "string" } },
                  workflow_action: { type: "string", enum: ["auto_approve", "manual_review", "escalate", "reject"] }
                },
                required: ["policy_verified", "overall_validation_score", "workflow_action"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_claim" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI validation error:", errorText);
      throw new Error("AI validation failed");
    }

    const aiData = await aiResponse.json();
    let validationResult;
    
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        validationResult = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("No tool call response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      validationResult = {
        policy_verified: false,
        member_verified: false,
        overall_validation_score: 0.5,
        workflow_action: "manual_review",
        validation_issues: ["Validation parsing failed - manual review required"]
      };
    }

    // Calculate policy limits
    const policyLimit = claim.claim_type === 'hospitalization' 
      ? (claim.policy?.hospitalization_limit || 0)
      : (claim.policy?.opd_limit || 0);
    
    const remainingCoverage = policyLimit - previousClaimsTotal;
    const maxPayable = Math.min(remainingCoverage, claim.claim_amount || 0);
    const coPayment = maxPayable * ((claim.policy?.co_payment_percentage || 0) / 100);

    // Store validation results
    const { error: validationError } = await supabase.from("claim_validations").upsert({
      claim_id: claimId,
      detected_claim_type: validationResult.detected_claim_type || claim.claim_type,
      mandatory_documents_status: validationResult.mandatory_documents_status || {},
      missing_documents: validationResult.missing_documents || [],
      policy_verified: validationResult.policy_verified,
      member_verified: validationResult.member_verified,
      coverage_details: validationResult.coverage_details || {},
      exclusions_found: validationResult.exclusions_found || [],
      previous_claims_total: previousClaimsTotal,
      remaining_coverage: remainingCoverage,
      max_payable_amount: maxPayable,
      co_payment_amount: coPayment,
      prescription_diagnosis_score: validationResult.prescription_diagnosis_score || 0,
      prescription_bill_score: validationResult.prescription_bill_score || 0,
      diagnosis_treatment_score: validationResult.diagnosis_treatment_score || 0,
      billing_policy_score: validationResult.billing_policy_score || 0,
      overall_validation_score: validationResult.overall_validation_score,
      validation_issues: validationResult.validation_issues || [],
      workflow_action: validationResult.workflow_action,
    }, { onConflict: 'claim_id' });

    if (validationError) {
      console.error("Error storing validation:", validationError);
    }

    // Update claim processing status
    await supabase
      .from("claims")
      .update({ 
        processing_status: "validation_complete",
        approved_amount: maxPayable - coPayment,
      })
      .eq("id", claimId);

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      validation_result: validationResult,
      policy_limit: policyLimit,
      remaining_coverage: remainingCoverage,
      max_payable: maxPayable,
      co_payment: coPayment,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error validating claim:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
