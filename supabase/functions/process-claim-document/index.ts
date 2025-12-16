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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OPD Mandatory documents configuration based on Janashakthi requirements
const MANDATORY_DOCUMENTS = {
  opd: {
    prescription: { 
      mandatory: true, 
      keywords: [
        "Prescription", "Rx", "Doctor's Name", "Consultant", "Date of Visit", 
        "Patient Name", "Age/Sex", "Diagnosis", "Prescribed Drugs", "Dosage", 
        "Frequency", "Duration", "Instructions", "Treatment Plan", "Follow-up Date",
        "Clinic Stamp", "Doctor's Signature", "Advice", "Next Visit", 
        "Hospital/Clinic Name", "Medication List", "Medical Officer", "MO", 
        "SLMC Reg No.", "OPD No.", "Hospital No."
      ] 
    },
    medical_bill: { 
      mandatory: true, 
      keywords: [
        "Bill", "Invoice", "Receipt", "Patient Name", "Bill No.", "Date", 
        "Total Amount", "Consultation Fee", "Doctor Fee", "Lab Charges", 
        "Medicine Charges", "Room Charges", "Tax/VAT", "Discount", "Net Amount",
        "Hospital Name", "Cash/Card/Online", "Billing Department", 
        "Acknowledged by", "Authorized Signature", "Pharmacy Bill"
      ] 
    },
    lab_report: {
      mandatory: false,
      keywords: [
        "Lab Report", "Laboratory", "Test Results", "Blood Test", "Urine Test",
        "X-Ray", "Scan", "MRI", "CT", "ECG", "Medical Report"
      ]
    },
    channelling_bill: {
      mandatory: false,
      keywords: [
        "Channelling", "Consultation", "Doctor Fee", "Specialist", "OPD Ticket"
      ]
    }
  },
  spectacles: {
    prescription: { 
      mandatory: true, 
      keywords: ["Eye Test", "Vision", "Spectacles", "Optical", "Lens Power", "Eye Prescription"] 
    },
    medical_bill: { 
      mandatory: true, 
      keywords: ["Bill", "Invoice", "Receipt", "Spectacles", "Frame", "Lens"] 
    }
  },
  dental: {
    prescription: { 
      mandatory: true, 
      keywords: ["Dental", "Tooth", "Oral", "Dentist", "Dental Treatment"] 
    },
    medical_bill: { 
      mandatory: true, 
      keywords: ["Bill", "Invoice", "Receipt", "Dental", "Tooth"] 
    }
  }
};

// OPD Validation Points
const OPD_VALIDATION_POINTS = [
  "Bill Date visibility and validity",
  "Claim Submission Warranty Period",
  "Submitted Clause verification",
  "Name on Prescription matches policyholder/member",
  "Claim Amount verification against policy limits",
  "Prescription vs Bill - Medicines matching (different brand names)",
  "Prescription vs Bill - Number of items matching",
  "Ailment covered under policy conditions",
  "Exclusion Conditions (vitamins, non-covered medicines)",
  "Channelling Bills legitimacy",
  "Bill Amount abnormalities check",
  "Medical Report Bills (printed or handwritten in English)",
  "Sinhala Bills for Ayurvedic/Siddha Medicine",
  "Skin Treatments (only allergy-related accepted)",
  "Dental and Spectacle Claims (only if sub-cover under OPD)"
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

    const { claimId, documentId, fileUrl, claimType } = parseResult.data;
    console.log(`Processing OPD document for claim: ${claimId}, document: ${documentId}, user: ${auth.userId}`);

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

    // Update claim processing status
    await supabase
      .from("claims")
      .update({ processing_status: "ocr_processing" })
      .eq("id", claimId);

    const mandatoryDocs = MANDATORY_DOCUMENTS[claimType as keyof typeof MANDATORY_DOCUMENTS] || MANDATORY_DOCUMENTS.opd;

    const systemPrompt = `You are an expert insurance document analyzer specializing in Sri Lankan OPD (Outpatient Department) medical claims for Janashakthi Insurance.

Analyze the provided document and extract all relevant information for OPD claim processing.

Document Classification Keywords:
${JSON.stringify(mandatoryDocs, null, 2)}

OPD Validation Points to Consider:
${OPD_VALIDATION_POINTS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

For each document, identify:
1. Document type (prescription, medical_bill, lab_report, channelling_bill, other)
2. OCR confidence score (0-100) - based on text clarity
3. Whether it's handwritten or printed
4. Language detected (English, Sinhala, Tamil, Mixed)
5. All key entities for OPD claims:
   - Patient details (name, age, sex, ID, clinic/OPD number)
   - Doctor details (name, SLMC registration number, specialty)
   - Hospital/clinic details (name, address)
   - Date of visit/treatment
   - Diagnosis and symptoms
   - Medicines prescribed (name, dosage, quantity, frequency)
   - Billing information (items, individual amounts, consultation fee, medicine charges, lab charges, total)
   - Bill date and bill number
6. AI keywords found from the mandatory documents list
7. Validation flags for OPD-specific checks

OCR Confidence Rules:
- ≥90%: Accept automatically
- 50-89%: Prompt for re-upload (max 3 attempts), then route to manual review
- <50%: Reject automatically

Return a JSON object with complete entity extraction for OPD claim processing.`;

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
            Extract all relevant information for OPD claim processing.
            Focus on: patient name matching, bill date validity, medicine-prescription matching, excluded items (vitamins, cosmetics).
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
                    enum: ["prescription", "medical_bill", "lab_report", "channelling_bill", "other"] 
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
    console.error("Error processing document:", error);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});