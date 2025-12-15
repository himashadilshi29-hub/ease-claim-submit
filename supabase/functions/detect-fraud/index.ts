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
    console.log(`Running fraud detection for claim: ${claimId}`);

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
      .update({ processing_status: "fraud_check_in_progress" })
      .eq("id", claimId);

    // Get claim details
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("*")
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

    // Get historical claims for baseline comparison
    const { data: historicalClaims } = await supabase
      .from("claims")
      .select("*, claim_documents(*)")
      .neq("id", claimId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Check for potential duplicates based on content
    const { data: potentialDuplicates } = await supabase
      .from("claims")
      .select("id, reference_number, claim_amount, diagnosis, hospital_name, created_at")
      .neq("id", claimId)
      .eq("policy_id", claim.policy_id)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    // Calculate historical baselines
    const avgClaimAmount = historicalClaims?.reduce((sum, c) => sum + (c.claim_amount || 0), 0) / (historicalClaims?.length || 1);
    const stdDevAmount = Math.sqrt(
      historicalClaims?.reduce((sum, c) => sum + Math.pow((c.claim_amount || 0) - avgClaimAmount, 2), 0) / (historicalClaims?.length || 1)
    );

    // Prepare fraud detection prompt
    const systemPrompt = `You are an expert insurance fraud detection system for Janashakthi Insurance in Sri Lanka.
Analyze this claim for potential fraud indicators:

1. Duplicate Detection:
   - Check if similar claims were submitted recently
   - Look for same bill amounts, hospitals, or procedures
   
2. Anomaly Detection:
   - Compare claim amount to historical average (Avg: ${avgClaimAmount.toFixed(2)}, StdDev: ${stdDevAmount.toFixed(2)})
   - Check for unusual patterns
   
3. Content Verification:
   - Verify consistency between documents
   - Check for altered or suspicious content
   
4. Provider Analysis:
   - Check frequency of claims from same hospital/doctor

Current Claim:
- Amount: ${claim.claim_amount}
- Hospital: ${claim.hospital_name || 'Not specified'}
- Doctor: ${claim.doctor_name || 'Not specified'}
- Diagnosis: ${claim.diagnosis || 'Not specified'}

Potential Duplicates: ${JSON.stringify(potentialDuplicates || [])}

OCR Results: ${JSON.stringify(ocrResults?.map(r => ({
  type: r.document_type,
  confidence: r.ocr_confidence,
  entities: r.extracted_entities
})) || [])}

Historical Baseline:
- Average Claim Amount: ${avgClaimAmount.toFixed(2)}
- Standard Deviation: ${stdDevAmount.toFixed(2)}
- Claims in Database: ${historicalClaims?.length || 0}`;

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
          { role: "user", content: "Analyze this claim for fraud indicators and provide detailed scoring." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_fraud",
              description: "Detect potential fraud in insurance claim",
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
                  stay_deviation_days: { type: "number" },
                  provider_claim_frequency: { type: "integer" },
                  historical_baseline: {
                    type: "object",
                    properties: {
                      avg_amount: { type: "number" },
                      std_dev: { type: "number" },
                      percentile: { type: "number" }
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
        tool_choice: { type: "function", function: { name: "detect_fraud" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI fraud detection error:", errorText);
      throw new Error("AI fraud detection failed");
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
      amount_deviation_percentage: fraudResult.amount_deviation_percentage || 0,
      stay_deviation_days: fraudResult.stay_deviation_days || 0,
      provider_claim_frequency: fraudResult.provider_claim_frequency || 0,
      historical_baseline: {
        avg_amount: avgClaimAmount,
        std_dev: stdDevAmount,
        ...fraudResult.historical_baseline
      },
      llm_analysis: fraudResult.llm_analysis || "",
      workflow_action: fraudResult.workflow_action,
    }, { onConflict: 'claim_id' });

    if (fraudError) {
      console.error("Error storing fraud results:", fraudError);
    }

    // Update claim with fraud scores
    await supabase
      .from("claims")
      .update({ 
        processing_status: "fraud_check_complete",
        fraud_flags: Math.round(fraudResult.fraud_score * 10),
        risk_score: Math.round((1 - fraudResult.anomaly_score) * 100),
        risk_level: fraudResult.fraud_score >= 0.7 ? 'high' : fraudResult.fraud_score >= 0.4 ? 'medium' : 'low',
        fraud_status: fraudResult.fraud_score >= 0.7 ? 'flagged' : fraudResult.fraud_score >= 0.4 ? 'suspicious' : 'clean',
      })
      .eq("id", claimId);

    return new Response(JSON.stringify({
      success: true,
      claim_id: claimId,
      fraud_result: fraudResult,
      historical_baseline: {
        avg_amount: avgClaimAmount,
        std_dev: stdDevAmount,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fraud detection:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
