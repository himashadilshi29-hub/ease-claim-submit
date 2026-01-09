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

// OPD Document Types and Validation Configuration
const OPD_DOCUMENT_TYPES = {
  prescription: {
    mandatory: true,
    purpose: "Proves medical necessity",
    keywords: ["Rx", "Doctor's Name", "Diagnosis", "Prescribed Drugs", "Dosage", "Frequency", "Duration", "SLMC Reg No.", "Consultant", "Treatment Plan"],
    validation_checks: ["doctor_name_present", "diagnosis_present", "medicines_listed", "dosage_specified", "date_valid"]
  },
  pharmacy_bill: {
    mandatory: true,
    purpose: "Proves cost incurred for medicines",
    keywords: ["Pharmacy Bill", "Medicine Charges", "Drug", "Tablet", "Capsule", "Syrup", "Ointment", "Total Amount", "Bill No.", "Invoice"],
    validation_checks: ["medicines_match_prescription", "quantities_match", "prices_reasonable", "no_excluded_items"]
  },
  doctor_charges: {
    mandatory: false,
    purpose: "Proves consultation/channelling cost incurred",
    keywords: ["Consultation Fee", "Doctor Fee", "Channelling Bill", "Specialist Fee", "OPD Ticket", "Appointment Fee", "Professional Fee"],
    validation_checks: ["fee_within_standard_range", "doctor_details_present", "date_matches_treatment"]
  }
};

// OPD Validation Points from Janashakthi requirements
const OPD_VALIDATION_RULES = {
  // Prescription Validation
  prescription_present: { weight: 0.15, description: "Prescription document is present and valid" },
  prescription_doctor_details: { weight: 0.05, description: "Doctor's name and SLMC registration number visible" },
  prescription_diagnosis: { weight: 0.10, description: "Diagnosis clearly stated on prescription" },
  prescription_medicines: { weight: 0.10, description: "Medicines, dosage, and frequency specified" },
  
  // Pharmacy Bill Validation
  pharmacy_bill_present: { weight: 0.10, description: "Pharmacy bill/invoice is present" },
  pharmacy_bill_medicines_match: { weight: 0.15, description: "Billed medicines match prescription (including generic equivalents)" },
  pharmacy_bill_quantity_match: { weight: 0.10, description: "Quantities billed match prescription" },
  pharmacy_bill_exclusions: { weight: 0.10, description: "No vitamins, cosmetics, or non-covered items" },
  
  // Doctor/Channelling Charges Validation
  doctor_charges_valid: { weight: 0.05, description: "Consultation/channelling fees within standard range" },
  
  // General Validation
  bill_date_check: { weight: 0.02, description: "Bill date clearly visible and valid" },
  warranty_period_check: { weight: 0.03, description: "Claim submitted within warranty period" },
  name_matching_check: { weight: 0.05, description: "Patient name matches policyholder/member" }
};

// Cross-Check Scoring Weights
const SCORING_WEIGHTS = {
  prescription_validation: 0.40,  // Prescription proves medical necessity
  prescription_bill_match: 0.35,  // Cross-check between prescription and bill
  doctor_charges_validation: 0.10, // Doctor/channelling fee validation
  policy_compliance: 0.15         // Policy limits and exclusions
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

## OPD Claim Validation Flow

### Step 1: PRESCRIPTION VALIDATION (Proves Medical Necessity)
The prescription is MANDATORY. Validate:
- Doctor's Name and SLMC Registration Number
- Diagnosis (medical condition/ailment)
- Prescribed Drugs with dosage, frequency, and duration
- Date of consultation
- Patient name matches policy member
Keywords to find: ${OPD_DOCUMENT_TYPES.prescription.keywords.join(', ')}

### Step 2: PHARMACY BILL VALIDATION (Proves Medicine Cost Incurred)
The pharmacy bill is MANDATORY. Validate:
- Medicine names and quantities
- Individual prices and total amount
- Bill date and bill number
- Pharmacy name/stamp
Keywords to find: ${OPD_DOCUMENT_TYPES.pharmacy_bill.keywords.join(', ')}

### Step 3: DOCTOR CHARGES VALIDATION (Consultation/Channelling)
Doctor fees are optional but should be validated if present:
- Consultation/channelling fee amount
- Doctor name matching prescription
- Fee within standard range (typically LKR 500-5000)
Keywords to find: ${OPD_DOCUMENT_TYPES.doctor_charges.keywords.join(', ')}

### Step 4: CRITICAL CROSS-CHECK (Prescription vs Bill)
Compare the Pharmacy Bill against the Prescription:
1. Each medicine billed MUST be on the prescription (or generic equivalent)
2. Quantities billed MUST match prescribed quantities
3. No vitamins, cosmetics, or non-covered items should be included
4. Only pay for what was prescribed

## Policy Details
- Type: ${claim.policy?.policy_type || 'retail'}
- OPD Limit: LKR ${claim.policy?.opd_limit || 0}
- Co-payment: ${claim.policy?.co_payment_percentage || 0}%
- Warranty Period: ${warrantyDays} days
- Exclusions: ${JSON.stringify(claim.policy?.exclusions || [])}
- Special Covers: ${JSON.stringify(claim.policy?.special_covers || [])}

## Claim Details
- Type: ${claim.claim_type}
- Amount: LKR ${claim.claim_amount}
- Diagnosis: ${claim.diagnosis || 'Not specified'}
- Date of Treatment: ${claim.date_of_treatment || 'Not specified'}
- Previous Claims Total: LKR ${previousClaimsTotal}
- Remaining Coverage: LKR ${(claim.policy?.opd_limit || 0) - previousClaimsTotal}
- Within Warranty: ${isWithinWarranty}

## Claimant Details
- Member Name: ${claim.member?.member_name || 'Unknown'}
- Relationship: ${claim.relationship}

## OCR Extracted Documents
${JSON.stringify(ocrResults?.map(r => ({
  document_type: r.document_type,
  confidence: r.ocr_confidence,
  entities: r.extracted_entities,
  language: r.language_detected,
  handwritten: r.is_handwritten,
  keywords_found: r.ai_keywords_found
})) || [], null, 2)}

## Medicine Database (for generic name matching)
${JSON.stringify(medicines?.slice(0, 30) || [])}

## Disease-Medicine Mappings
${JSON.stringify(diseaseMappings || [])}

## Scoring Weights
- Prescription Validation: ${SCORING_WEIGHTS.prescription_validation * 100}%
- Prescription ↔ Bill Cross-Check: ${SCORING_WEIGHTS.prescription_bill_match * 100}%
- Doctor Charges Validation: ${SCORING_WEIGHTS.doctor_charges_validation * 100}%
- Policy Compliance: ${SCORING_WEIGHTS.policy_compliance * 100}%

Provide detailed validation with:
1. Prescription analysis (medical necessity proven?)
2. Pharmacy bill analysis (costs verified?)
3. Doctor charges analysis (fees valid?)
4. Cross-check results (bill matches prescription?)
5. Excluded items found (vitamins, cosmetics, non-covered)
6. Final payable amount calculation`;

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
                  // Step 1: Prescription Validation
                  prescription_validation: {
                    type: "object",
                    properties: {
                      present: { type: "boolean", description: "Prescription document found" },
                      doctor_name: { type: "string" },
                      doctor_slmc_no: { type: "string" },
                      diagnosis: { type: "string" },
                      prescribed_medicines: { 
                        type: "array", 
                        items: { 
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            generic_name: { type: "string" },
                            dosage: { type: "string" },
                            quantity: { type: "number" },
                            frequency: { type: "string" }
                          }
                        }
                      },
                      date_of_prescription: { type: "string" },
                      patient_name_matches: { type: "boolean" },
                      score: { type: "number", minimum: 0, maximum: 1, description: "Prescription validation score" }
                    }
                  },
                  // Step 2: Pharmacy Bill Validation
                  pharmacy_bill_validation: {
                    type: "object",
                    properties: {
                      present: { type: "boolean", description: "Pharmacy bill found" },
                      pharmacy_name: { type: "string" },
                      bill_date: { type: "string" },
                      bill_number: { type: "string" },
                      billed_medicines: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            quantity: { type: "number" },
                            unit_price: { type: "number" },
                            total_price: { type: "number" },
                            is_covered: { type: "boolean" }
                          }
                        }
                      },
                      medicine_charges_total: { type: "number" },
                      score: { type: "number", minimum: 0, maximum: 1 }
                    }
                  },
                  // Step 3: Doctor Charges Validation
                  doctor_charges_validation: {
                    type: "object",
                    properties: {
                      present: { type: "boolean", description: "Channelling/consultation bill found" },
                      consultation_fee: { type: "number" },
                      doctor_name_matches_prescription: { type: "boolean" },
                      fee_within_standard_range: { type: "boolean" },
                      channelling_bill_legitimate: { type: "boolean" },
                      score: { type: "number", minimum: 0, maximum: 1 }
                    }
                  },
                  // Step 4: Cross-Check Results
                  prescription_bill_crosscheck: {
                    type: "object",
                    properties: {
                      all_billed_medicines_prescribed: { type: "boolean" },
                      quantities_match: { type: "boolean" },
                      unmatched_medicines: { type: "array", items: { type: "string" }, description: "Medicines billed but not prescribed" },
                      quantity_mismatches: { type: "array", items: { type: "string" } },
                      generic_equivalents_used: { type: "array", items: { type: "string" }, description: "Brand names matched to generic" },
                      crosscheck_score: { type: "number", minimum: 0, maximum: 1 }
                    }
                  },
                  // Exclusions Found
                  exclusions_analysis: {
                    type: "object",
                    properties: {
                      vitamins_found: { type: "array", items: { type: "string" } },
                      cosmetics_found: { type: "array", items: { type: "string" } },
                      non_covered_medicines: { type: "array", items: { type: "string" } },
                      excluded_amount: { type: "number", description: "Total amount of excluded items" }
                    }
                  },
                  // Summary
                  mandatory_documents_status: {
                    type: "object",
                    properties: {
                      prescription: { type: "boolean" },
                      pharmacy_bill: { type: "boolean" },
                      doctor_charges: { type: "boolean" }
                    }
                  },
                  missing_documents: { type: "array", items: { type: "string" } },
                  previous_claims_total: { type: "number" },
                  remaining_coverage: { type: "number" },
                  covered_amount: { type: "number", description: "Amount after removing exclusions" },
                  max_payable_amount: { type: "number" },
                  co_payment_amount: { type: "number" },
                  // Scoring
                  prescription_validation_score: { type: "number", minimum: 0, maximum: 1 },
                  prescription_bill_match_score: { type: "number", minimum: 0, maximum: 1 },
                  doctor_charges_score: { type: "number", minimum: 0, maximum: 1 },
                  policy_compliance_score: { type: "number", minimum: 0, maximum: 1 },
                  overall_validation_score: { type: "number", minimum: 0, maximum: 1 },
                  validation_issues: { type: "array", items: { type: "string" } },
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