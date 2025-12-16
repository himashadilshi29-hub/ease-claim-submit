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
    "Access-Control-Allow-Origin": isAllowed ? origin : (allowedOrigins[0] || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Generate request ID for error tracking
function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// OPD Validation Points from Janashakthi requirements
const OPD_VALIDATION_RULES = {
  bill_date_check: { weight: 0.10, description: "Bill Date must be clearly visible and valid" },
  warranty_period_check: { weight: 0.10, description: "Claim must be submitted within the warranty period (typically 30 days)" },
  submitted_clause_check: { weight: 0.05, description: "Submitted clause must be clearly mentioned in claim documents" },
  name_matching_check: { weight: 0.10, description: "Name on Prescription must match policyholder or covered member" },
  claim_amount_check: { weight: 0.10, description: "Claim amount must align with policy limits" },
  prescription_bill_medicine_match: { weight: 0.15, description: "Medicines billed must match prescription (even with different brand names)" },
  prescription_bill_quantity_match: { weight: 0.10, description: "Quantity in bill must match prescription" },
  ailment_coverage_check: { weight: 0.10, description: "Ailment must fall under covered ailments as per policy" },
  exclusion_check: { weight: 0.10, description: "Exclude vitamins, cosmetics, and non-covered medicines" },
  channelling_bill_check: { weight: 0.05, description: "Verify channelling bill legitimacy and consistency with standard charges" },
  bill_amount_abnormality_check: { weight: 0.05, description: "Identify unusually high or inconsistent billing amounts" }
};

const SCORING_WEIGHTS = {
  prescription_diagnosis: 0.35,
  prescription_bill: 0.30,
  diagnosis_treatment: 0.20,
  billing_policy: 0.15
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
  const corsHeaders = getCorsHeaders(req);
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    console.log(`[${requestId}] Validating OPD claim: ${claimId}, user: ${auth.userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] Missing LOVABLE_API_KEY`);
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
        return new Response(JSON.stringify({ error: "Access denied", request_id: requestId }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update processing status
    await supabase
      .from("claims")
      .update({ processing_status: "validation_in_progress" })
      .eq("id", claimId);

    // Get claim details with policy and member
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
      .select("claim_amount, approved_amount, claim_type, date_of_treatment")
      .eq("policy_id", claim.policy_id)
      .eq("status", "approved")
      .neq("id", claimId);

    const previousClaimsTotal = previousClaims?.reduce((sum, c) => sum + (c.approved_amount || 0), 0) || 0;

    // Calculate warranty period
    const warrantyDays = claim.policy?.warranty_period_days || 30;
    const claimDate = new Date(claim.created_at);
    const treatmentDate = claim.date_of_treatment ? new Date(claim.date_of_treatment) : null;
    const isWithinWarranty = treatmentDate 
      ? (claimDate.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24) <= warrantyDays
      : true;

    const systemPrompt = `You are an expert OPD insurance claim validator for Janashakthi Insurance in Sri Lanka.

Validate this OPD claim based on the following 15 validation points:

1. Bill Date – Must be clearly visible and valid
2. Claim Submission Warranty Period – Within ${warrantyDays} days of treatment
3. Submitted Clause – Clearly mentioned in claim documents
4. Name on Prescription – Must match policyholder or covered member
5. Claim Amount – Verify against policy OPD limit
6. Prescription vs. Bill – Medicines matching (consider different brand names for same generic)
7. Prescription vs. Bill – Number of items must match
8. Ailment – Must be covered under policy conditions
9. Exclusion Conditions – Exclude vitamins, cosmetics, non-covered medicines
10. Channelling Bills – Verify legitimacy and standard charges
11. Bill Amount Abnormalities – Check for unusually high amounts
12. Medical Report Bills – Acceptable if printed/handwritten in English
13. Sinhala Bills for Ayurvedic/Siddha Medicine – Accept if applicable
14. Skin Treatments – Accept only for allergy-related conditions
15. Dental and Spectacle Claims – Accept only if covered under OPD sub-cover

Policy Details:
- Type: ${claim.policy?.policy_type || 'retail'}
- OPD Limit: LKR ${claim.policy?.opd_limit || 0}
- Co-payment: ${claim.policy?.co_payment_percentage || 0}%
- Warranty Period: ${warrantyDays} days
- Exclusions: ${JSON.stringify(claim.policy?.exclusions || [])}
- Special Covers: ${JSON.stringify(claim.policy?.special_covers || [])}

Claim Details:
- Type: ${claim.claim_type}
- Amount: LKR ${claim.claim_amount}
- Diagnosis: ${claim.diagnosis || 'Not specified'}
- Date of Treatment: ${claim.date_of_treatment || 'Not specified'}
- Previous Claims Total: LKR ${previousClaimsTotal}
- Within Warranty: ${isWithinWarranty}

Claimant Details:
- Member Name: ${claim.member?.member_name || 'Unknown'}
- Relationship: ${claim.relationship}

OCR Extracted Data:
${JSON.stringify(ocrResults?.map(r => ({
  type: r.document_type,
  confidence: r.ocr_confidence,
  entities: r.extracted_entities,
  language: r.language_detected,
  handwritten: r.is_handwritten
})) || [], null, 2)}

Medicine Database (sample):
${JSON.stringify(medicines?.slice(0, 30) || [])}

Disease-Medicine Mappings:
${JSON.stringify(diseaseMappings || [])}

Scoring Weights:
- Prescription ↔ Diagnosis: ${SCORING_WEIGHTS.prescription_diagnosis * 100}%
- Prescription ↔ Bill: ${SCORING_WEIGHTS.prescription_bill * 100}%
- Diagnosis ↔ Treatments: ${SCORING_WEIGHTS.diagnosis_treatment * 100}%
- Billing ↔ Policy: ${SCORING_WEIGHTS.billing_policy * 100}%

Return comprehensive validation results with detailed scoring for each check.`;

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
          { role: "user", content: "Validate this OPD insurance claim with all 15 validation points and provide detailed scoring." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_opd_claim",
              description: "Validate OPD insurance claim with comprehensive scoring",
              parameters: {
                type: "object",
                properties: {
                  detected_claim_type: { type: "string", enum: ["opd", "dental", "spectacles"] },
                  policy_verified: { type: "boolean" },
                  member_verified: { type: "boolean" },
                  name_matches_prescription: { type: "boolean" },
                  bill_date_valid: { type: "boolean" },
                  within_warranty_period: { type: "boolean" },
                  mandatory_documents_status: {
                    type: "object",
                    properties: {
                      prescription: { type: "boolean" },
                      medical_bill: { type: "boolean" },
                      lab_report: { type: "boolean" },
                      channelling_bill: { type: "boolean" }
                    }
                  },
                  missing_documents: { type: "array", items: { type: "string" } },
                  coverage_details: {
                    type: "object",
                    properties: {
                      opd_limit: { type: "number" },
                      available_limit: { type: "number" },
                      covered_items: { type: "array", items: { type: "string" } },
                      excluded_items: { type: "array", items: { type: "string" } }
                    }
                  },
                  exclusions_found: { type: "array", items: { type: "string" } },
                  vitamins_found: { type: "array", items: { type: "string" } },
                  cosmetics_found: { type: "array", items: { type: "string" } },
                  non_covered_medicines: { type: "array", items: { type: "string" } },
                  prescription_bill_match: {
                    type: "object",
                    properties: {
                      medicines_match: { type: "boolean" },
                      quantity_match: { type: "boolean" },
                      mismatched_items: { type: "array", items: { type: "string" } }
                    }
                  },
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
                  opd_validation_checklist: {
                    type: "object",
                    properties: {
                      bill_date_visible: { type: "boolean" },
                      warranty_period_ok: { type: "boolean" },
                      submitted_clause_present: { type: "boolean" },
                      name_matches: { type: "boolean" },
                      amount_within_limit: { type: "boolean" },
                      medicines_match: { type: "boolean" },
                      quantities_match: { type: "boolean" },
                      ailment_covered: { type: "boolean" },
                      no_exclusions: { type: "boolean" },
                      channelling_valid: { type: "boolean" },
                      amount_normal: { type: "boolean" },
                      reports_acceptable: { type: "boolean" },
                      sinhala_bills_ok: { type: "boolean" },
                      skin_treatment_ok: { type: "boolean" },
                      dental_spectacles_ok: { type: "boolean" }
                    }
                  },
                  workflow_action: { type: "string", enum: ["auto_approve", "manual_review", "escalate", "reject"] }
                },
                required: ["policy_verified", "overall_validation_score", "workflow_action"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_opd_claim" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI validation error:", await aiResponse.text());
      throw new Error("Validation failed");
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

    // Calculate policy limits - OPD only
    const opdLimit = claim.policy?.opd_limit || 0;
    const remainingCoverage = opdLimit - previousClaimsTotal;
    const maxPayable = Math.min(remainingCoverage, claim.claim_amount || 0);
    const coPaymentPercentage = claim.policy?.co_payment_percentage || 0;
    const coPayment = maxPayable * (coPaymentPercentage / 100);

    // Store validation results
    const { error: validationError } = await supabase.from("claim_validations").upsert({
      claim_id: claimId,
      detected_claim_type: validationResult.detected_claim_type || claim.claim_type,
      mandatory_documents_status: validationResult.mandatory_documents_status || {},
      missing_documents: validationResult.missing_documents || [],
      policy_verified: validationResult.policy_verified,
      member_verified: validationResult.member_verified,
      coverage_details: {
        ...validationResult.coverage_details,
        opd_limit: opdLimit,
        vitamins_found: validationResult.vitamins_found,
        cosmetics_found: validationResult.cosmetics_found,
        non_covered_medicines: validationResult.non_covered_medicines,
        prescription_bill_match: validationResult.prescription_bill_match,
        opd_validation_checklist: validationResult.opd_validation_checklist
      },
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
      validation_result: {
        ...validationResult,
        opd_limit: opdLimit,
        previous_claims_total: previousClaimsTotal,
        remaining_coverage: remainingCoverage,
        max_payable: maxPayable,
        co_payment: coPayment,
        within_warranty: isWithinWarranty
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error validating claim:`, error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request", request_id: requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});