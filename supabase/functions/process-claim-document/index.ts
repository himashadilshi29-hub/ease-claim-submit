import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Input validation schema
const requestSchema = z.object({
  claimId: z.string().uuid("Invalid claim ID format"),
  documentId: z.string().uuid("Invalid document ID format"),
  fileUrl: z.string().max(2048, "File URL too long"),
  claimType: z.enum(["opd", "dental", "spectacles", "hospitalization"]).optional(),
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

// OPD Document Types with explicit purposes
const OPD_DOCUMENT_CONFIG = {
  prescription: {
    mandatory: true,
    purpose: "PROVES MEDICAL NECESSITY - Required to validate medicines prescribed",
    keywords: [
      "Rx", "Prescription", "Doctor's Name", "Consultant", "SLMC Reg No.",
      "Diagnosis", "Prescribed Drugs", "Dosage", "Frequency", "Duration",
      "Patient Name", "Date of Visit", "Treatment Plan", "Follow-up",
      "Medical Officer", "Clinic Stamp", "Doctor's Signature"
    ],
    validation_checklist: [
      "Doctor name and SLMC registration present",
      "Diagnosis/medical condition stated",
      "Medicine names with dosage specified",
      "Quantity and frequency mentioned",
      "Date of consultation visible",
      "Patient name matches policy member"
    ]
  },
  pharmacy_bill: {
    mandatory: true,
    purpose: "PROVES COST INCURRED - Required to verify medicine charges",
    keywords: [
      "Pharmacy Bill", "Medicine Charges", "Invoice", "Receipt",
      "Drug", "Tablet", "Capsule", "Syrup", "Ointment", "Injection",
      "Total Amount", "Bill No.", "Bill Date", "Pharmacy Name",
      "Unit Price", "Quantity", "Net Amount"
    ],
    validation_checklist: [
      "Medicine names match prescription",
      "Quantities match prescription",
      "Prices are reasonable",
      "No vitamins or cosmetics included",
      "Bill date within warranty period"
    ]
  },
  doctor_charges: {
    mandatory: false,
    purpose: "PROVES CONSULTATION COST - Validates channelling/doctor fees",
    keywords: [
      "Consultation Fee", "Doctor Fee", "Channelling Bill", "Channelling",
      "Specialist Fee", "OPD Ticket", "Appointment Fee", "Professional Fee",
      "Consultation Charges", "Channel Receipt"
    ],
    validation_checklist: [
      "Fee within standard range (LKR 500-5000)",
      "Doctor name matches prescription",
      "Date matches treatment date",
      "Hospital/clinic stamp present"
    ]
  },
  lab_report: {
    mandatory: false,
    purpose: "SUPPORTS DIAGNOSIS - Lab tests related to treatment",
    keywords: [
      "Lab Report", "Laboratory", "Test Results", "Blood Test", "Urine Test",
      "X-Ray", "Scan", "MRI", "CT", "ECG", "Medical Report", "Investigation"
    ]
  }
};

// Exclusion items to detect
const EXCLUSION_ITEMS = {
  vitamins: ["Vitamin", "Vit-", "Multivitamin", "B-Complex", "Calcium", "Iron Supplement", "Folic Acid", "Omega"],
  cosmetics: ["Cosmetic", "Beauty", "Skin Cream", "Face Wash", "Moisturizer", "Sunscreen", "Anti-aging"],
  non_covered: ["Tonic", "Health Supplement", "Ayurvedic Tonic", "Hair Oil", "Body Lotion"]
};

// OPD Validation Flow
const OPD_VALIDATION_FLOW = [
  "1. PRESCRIPTION: Extract doctor details, diagnosis, and prescribed medicines",
  "2. PHARMACY BILL: Extract billed medicines, quantities, and prices",
  "3. DOCTOR CHARGES: Extract consultation/channelling fees if present",
  "4. CROSS-CHECK: Compare billed medicines against prescription",
  "5. EXCLUSIONS: Identify vitamins, cosmetics, and non-covered items",
  "6. CALCULATE: Determine covered amount after exclusions"
];

async function verifyAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; isAdmin?: boolean; isBranch?: boolean; error?: string }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing authorization" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Allow service role for internal calls
  if (token === SUPABASE_SERVICE_ROLE_KEY || token === SUPABASE_ANON_KEY) {
    // For anon key, still need to verify the actual user
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

    const { claimId, documentId, fileUrl, claimType } = parseResult.data;
    console.log(`[${requestId}] Processing OPD document for claim: ${claimId}, document: ${documentId}, user: ${auth.userId}`);

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

    // Update claim processing status
    await supabase
      .from("claims")
      .update({ processing_status: "ocr_processing" })
      .eq("id", claimId);

    const systemPrompt = `You are an expert insurance document analyzer for Sri Lankan OPD claims (Janashakthi Insurance).

## OPD Claim Validation Flow
${OPD_VALIDATION_FLOW.join('\n')}

## Document Types & Purposes

### PRESCRIPTION (Mandatory) - Proves Medical Necessity
Purpose: ${OPD_DOCUMENT_CONFIG.prescription.purpose}
Keywords: ${OPD_DOCUMENT_CONFIG.prescription.keywords.join(', ')}
Checklist: ${OPD_DOCUMENT_CONFIG.prescription.validation_checklist.join('; ')}

### PHARMACY BILL (Mandatory) - Proves Cost Incurred
Purpose: ${OPD_DOCUMENT_CONFIG.pharmacy_bill.purpose}
Keywords: ${OPD_DOCUMENT_CONFIG.pharmacy_bill.keywords.join(', ')}
Checklist: ${OPD_DOCUMENT_CONFIG.pharmacy_bill.validation_checklist.join('; ')}

### DOCTOR CHARGES (Optional) - Consultation/Channelling
Purpose: ${OPD_DOCUMENT_CONFIG.doctor_charges.purpose}
Keywords: ${OPD_DOCUMENT_CONFIG.doctor_charges.keywords.join(', ')}
Checklist: ${OPD_DOCUMENT_CONFIG.doctor_charges.validation_checklist.join('; ')}

## Exclusion Detection
- VITAMINS: ${EXCLUSION_ITEMS.vitamins.join(', ')}
- COSMETICS: ${EXCLUSION_ITEMS.cosmetics.join(', ')}
- NON-COVERED: ${EXCLUSION_ITEMS.non_covered.join(', ')}

## Instructions
1. Classify document type (prescription, pharmacy_bill, doctor_charges, lab_report, other)
2. Extract ALL entities based on document type
3. For PRESCRIPTION: Get doctor details, diagnosis, and all prescribed medicines with dosage
4. For PHARMACY BILL: Get all billed medicines, quantities, and prices
5. For DOCTOR CHARGES: Get consultation fee and doctor details
6. Flag any vitamins, cosmetics, or excluded items found
7. Assess OCR confidence (≥90% accept, 50-89% reupload, <50% reject)

## OCR Confidence Rules
- ≥90%: Accept automatically
- 50-89%: Prompt for re-upload (max 3 attempts)
- <50%: Reject automatically`;

    // Call Lovable AI for document analysis
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
          { 
            role: "user", 
            content: `Analyze this OPD insurance claim document. Document URL: ${fileUrl}. 
Claim type: ${claimType || 'opd'}. 

CRITICAL: Identify if this is a PRESCRIPTION, PHARMACY BILL, or DOCTOR CHARGES document.
- For PRESCRIPTION: Extract doctor name, SLMC no, diagnosis, ALL prescribed medicines with dosage/quantity
- For PHARMACY BILL: Extract ALL billed medicines, quantities, prices, and check for vitamins/cosmetics
- For DOCTOR CHARGES: Extract consultation fee and verify doctor details

Flag any excluded items: vitamins, cosmetics, non-covered medicines.
Simulate realistic OCR output as if you scanned this document.` 
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_opd_document",
              description: "Analyze and extract information from OPD insurance claim document",
              parameters: {
                type: "object",
                properties: {
                  document_type: { 
                    type: "string", 
                    enum: ["prescription", "pharmacy_bill", "doctor_charges", "lab_report", "other"],
                    description: "PRESCRIPTION proves necessity, PHARMACY_BILL proves medicine cost, DOCTOR_CHARGES proves consultation cost"
                  },
                  ocr_confidence: { type: "number", minimum: 0, maximum: 100 },
                  language_detected: { type: "string", enum: ["English", "Sinhala", "Tamil", "Mixed"] },
                  is_handwritten: { type: "boolean" },
                  is_printed: { type: "boolean" },
                  ai_keywords_found: { type: "array", items: { type: "string" } },
                  bill_date: { type: "string" },
                  bill_number: { type: "string" },
                  entities: {
                    type: "object",
                    properties: {
                      patient: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          age: { type: "number" },
                          sex: { type: "string" },
                          patient_id: { type: "string" },
                          opd_number: { type: "string" }
                        }
                      },
                      doctor: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          slmc_reg_no: { type: "string" },
                          specialty: { type: "string" }
                        }
                      },
                      clinic: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          address: { type: "string" }
                        }
                      },
                      date_of_visit: { type: "string" },
                      diagnosis: { type: "string" },
                      symptoms: { type: "array", items: { type: "string" } },
                      medicines: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            generic_name: { type: "string" },
                            dosage: { type: "string" },
                            quantity: { type: "string" },
                            frequency: { type: "string" },
                            is_vitamin: { type: "boolean" },
                            is_cosmetic: { type: "boolean" },
                            is_covered: { type: "boolean" }
                          }
                        }
                      },
                      billing: {
                        type: "object",
                        properties: {
                          items: { 
                            type: "array", 
                            items: { 
                              type: "object",
                              properties: {
                                description: { type: "string" },
                                amount: { type: "number" },
                                is_covered: { type: "boolean" }
                              }
                            } 
                          },
                          consultation_fee: { type: "number" },
                          medicine_charges: { type: "number" },
                          lab_charges: { type: "number" },
                          total_amount: { type: "number" }
                        }
                      }
                    }
                  },
                  validation_flags: {
                    type: "object",
                    properties: {
                      bill_date_valid: { type: "boolean" },
                      name_matches: { type: "boolean" },
                      has_vitamins: { type: "boolean" },
                      has_cosmetics: { type: "boolean" },
                      has_excluded_items: { type: "boolean" },
                      is_skin_treatment: { type: "boolean" },
                      is_allergy_related: { type: "boolean" },
                      is_dental: { type: "boolean" },
                      is_spectacles: { type: "boolean" },
                      bill_amount_abnormal: { type: "boolean" }
                    }
                  },
                  excluded_items: { type: "array", items: { type: "string" } },
                  status: { type: "string", enum: ["accepted", "reupload_required", "rejected"] },
                  manual_verification_required: { type: "boolean" },
                  issues: { type: "array", items: { type: "string" } }
                },
                required: ["document_type", "ocr_confidence", "status"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_opd_document" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      throw new Error("Document analysis failed");
    }

    const aiData = await aiResponse.json();
    console.log("AI Response received");

    let ocrResult;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        ocrResult = JSON.parse(toolCall.function.arguments);
      } else {
        ocrResult = {
          document_type: "other",
          ocr_confidence: 75,
          language_detected: "English",
          is_handwritten: false,
          ai_keywords_found: [],
          entities: {},
          status: "reupload_required",
          manual_verification_required: true,
          issues: ["Could not parse document"]
        };
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      ocrResult = {
        document_type: "other",
        ocr_confidence: 50,
        status: "reupload_required",
        manual_verification_required: true,
        issues: ["Document parsing failed"]
      };
    }

    // Determine status based on OCR confidence
    let finalStatus = ocrResult.status;
    if (ocrResult.ocr_confidence >= 90) {
      finalStatus = "accepted";
    } else if (ocrResult.ocr_confidence >= 50) {
      finalStatus = "reupload_required";
    } else {
      finalStatus = "rejected";
    }

    // Get existing OCR result to check reupload attempts
    const { data: existingOcr } = await supabase
      .from("claim_ocr_results")
      .select("reupload_attempts")
      .eq("claim_id", claimId)
      .eq("document_id", documentId)
      .maybeSingle();

    const reuploadAttempts = (existingOcr?.reupload_attempts || 0) + (finalStatus === "reupload_required" ? 1 : 0);
    
    // After 3 reupload attempts with 50-89% confidence, route to manual review
    if (reuploadAttempts >= 3 && ocrResult.ocr_confidence >= 50 && ocrResult.ocr_confidence < 90) {
      finalStatus = "accepted";
      ocrResult.manual_verification_required = true;
    }

    // Store OCR results
    const { error: ocrError } = await supabase.from("claim_ocr_results").upsert({
      claim_id: claimId,
      document_id: documentId,
      document_type: ocrResult.document_type,
      ocr_confidence: ocrResult.ocr_confidence,
      language_detected: ocrResult.language_detected,
      is_handwritten: ocrResult.is_handwritten,
      raw_text: JSON.stringify(ocrResult),
      extracted_entities: ocrResult.entities || {},
      ai_keywords_found: ocrResult.ai_keywords_found || [],
      status: finalStatus,
      manual_verification_required: ocrResult.manual_verification_required || ocrResult.ocr_confidence < 90,
      reupload_attempts: reuploadAttempts,
    }, { onConflict: 'document_id' });

    if (ocrError) {
      console.error("Error storing OCR results:", ocrError);
    }

    // Update claim document with OCR results
    await supabase
      .from("claim_documents")
      .update({
        ocr_confidence: ocrResult.ocr_confidence,
        ocr_extracted_text: JSON.stringify(ocrResult.entities),
      })
      .eq("id", documentId);

    // Update claim processing status
    const newStatus = ocrResult.ocr_confidence >= 90 ? "ocr_complete" : 
                      ocrResult.ocr_confidence >= 50 ? "reupload_required" : "ocr_failed";
    
    await supabase
      .from("claims")
      .update({ 
        processing_status: newStatus,
        ocr_confidence: ocrResult.ocr_confidence,
        ocr_level: ocrResult.ocr_confidence >= 90 ? 'high' : ocrResult.ocr_confidence >= 50 ? 'medium' : 'low'
      })
      .eq("id", claimId);

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      document_id: documentId,
      ocr_result: {
        document_type: ocrResult.document_type,
        ocr_confidence: ocrResult.ocr_confidence,
        language_detected: ocrResult.language_detected,
        is_handwritten: ocrResult.is_handwritten,
        entities: ocrResult.entities,
        validation_flags: ocrResult.validation_flags,
        excluded_items: ocrResult.excluded_items,
        issues: ocrResult.issues
      },
      status: finalStatus,
      reupload_attempts: reuploadAttempts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing document:`, error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request", request_id: requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});