import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS with origin validation
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
  const isAllowed = allowedOrigins.length === 0 || 
                    allowedOrigins.includes(origin) || 
                    origin.includes("lovable.dev") || 
                    origin.includes("localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin || "*" : (allowedOrigins[0] || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Validation result types
type ClaimStatus = 'APPROVED' | 'REJECTED' | 'PARTIAL_APPROVAL' | 'FLAGGED_FOR_REVIEW';

interface ValidationResult {
  status: ClaimStatus;
  approved_amount: number;
  rejected_reason: string | null;
  flagged_items: string[];
  deducted_items: Array<{ item: string; reason: string; amount?: number }>;
  balance_info: {
    opd_remaining: number;
    hospitalization_remaining: number;
    dental_remaining: number;
    spectacles_remaining: number;
  } | null;
  validation_steps: Array<{ step: string; passed: boolean; message: string }>;
}

interface OCRData {
  patient_name: string;
  company_name?: string;
  policy_number?: string;
  employee_nic?: string;
  bill_date: string;
  total_amount: number;
  line_items: Array<{ name: string; amount: number }>;
  doctor_seal_detected: boolean;
  claim_type?: 'OPD' | 'Hospitalization' | 'Pharmacy' | 'Dental' | 'Spectacles' | 'OPD Drugs';
}

interface MemberWithScheme {
  id: string;
  employee_name: string;
  scheme_id: string;
  hospitalization_used: number;
  opd_used: number;
  dental_used: number;
  spectacles_used: number;
  last_spectacle_claim_date: string | null;
  corporate_policy: {
    policy_number: string;
    company_name: string;
    claim_submission_deadline_days: number;
    spectacle_claim_interval_years: number;
  };
  scheme: {
    hospitalization_limit: number;
    opd_limit: number;
    dental_limit: number;
    spectacles_limit: number;
  };
}

interface ExclusionKeyword {
  keyword: string;
  category: string;
  exception_condition: string | null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Starting corporate claim validation`);

  try {
    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const ocrData: OCRData = await req.json();
    console.log(`[${requestId}] OCR Data received:`, JSON.stringify(ocrData, null, 2));

    // Initialize validation result
    const result: ValidationResult = {
      status: 'APPROVED',
      approved_amount: ocrData.total_amount,
      rejected_reason: null,
      flagged_items: [],
      deducted_items: [],
      balance_info: null,
      validation_steps: []
    };

    // ========== STEP 1: Company & Scheme Identification ==========
    console.log(`[${requestId}] Step 1: Identifying member and scheme`);
    
    let member: MemberWithScheme | null = null;
    
    // Try to find member by name or NIC
    const { data: memberData, error: memberError } = await supabase
      .from('corporate_policy_members')
      .select(`
        id,
        employee_name,
        scheme_id,
        hospitalization_used,
        opd_used,
        dental_used,
        spectacles_used,
        last_spectacle_claim_date,
        corporate_policy:corporate_policies!corporate_policy_members_corporate_policy_id_fkey (
          policy_number,
          company_name,
          claim_submission_deadline_days,
          spectacle_claim_interval_years
        ),
        scheme:corporate_policy_schemes!corporate_policy_members_scheme_id_fkey (
          hospitalization_limit,
          opd_limit,
          dental_limit,
          spectacles_limit
        )
      `)
      .or(`employee_name.ilike.%${ocrData.patient_name}%,employee_nic.eq.${ocrData.employee_nic || ''}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error(`[${requestId}] Error finding member:`, memberError);
      throw new Error(`Database error: ${memberError.message}`);
    }

    if (!memberData) {
      result.status = 'REJECTED';
      result.rejected_reason = 'Member not found in any corporate policy';
      result.approved_amount = 0;
      result.validation_steps.push({
        step: 'Member Identification',
        passed: false,
        message: `No active member found for: ${ocrData.patient_name}`
      });
      
      console.log(`[${requestId}] Member not found, returning rejection`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Type assertion after validation
    member = {
      ...memberData,
      corporate_policy: memberData.corporate_policy as unknown as MemberWithScheme['corporate_policy'],
      scheme: memberData.scheme as unknown as MemberWithScheme['scheme']
    };

    result.validation_steps.push({
      step: 'Member Identification',
      passed: true,
      message: `Found member: ${member.employee_name} under ${member.corporate_policy.company_name} (${member.corporate_policy.policy_number})`
    });

    console.log(`[${requestId}] Member identified: ${member.employee_name}`);

    // ========== STEP 2: Submission Deadline Check ==========
    console.log(`[${requestId}] Step 2: Checking submission deadline`);
    
    const billDate = new Date(ocrData.bill_date);
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
    const deadlineDays = member.corporate_policy.claim_submission_deadline_days || 90;

    if (daysDifference > deadlineDays) {
      result.status = 'REJECTED';
      result.rejected_reason = `Time Barred: Claim submitted ${daysDifference} days after bill date. Maximum allowed: ${deadlineDays} days.`;
      result.approved_amount = 0;
      result.validation_steps.push({
        step: 'Submission Deadline',
        passed: false,
        message: result.rejected_reason
      });

      console.log(`[${requestId}] Claim rejected - time barred`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    result.validation_steps.push({
      step: 'Submission Deadline',
      passed: true,
      message: `Claim submitted ${daysDifference} days after bill date (within ${deadlineDays} day limit)`
    });

    // ========== STEP 3: Keyword Filtering (Exclusions) ==========
    console.log(`[${requestId}] Step 3: Scanning for excluded keywords`);
    
    const { data: exclusionKeywords, error: keywordError } = await supabase
      .from('claim_exclusion_keywords')
      .select('keyword, category, exception_condition')
      .eq('is_active', true);

    if (keywordError) {
      console.error(`[${requestId}] Error fetching exclusion keywords:`, keywordError);
    }

    const keywords: ExclusionKeyword[] = exclusionKeywords || [];
    let totalDeducted = 0;

    for (const lineItem of ocrData.line_items) {
      const itemNameLower = lineItem.name.toLowerCase();
      
      for (const exclusion of keywords) {
        if (itemNameLower.includes(exclusion.keyword.toLowerCase())) {
          // Check for exception condition
          let isExcepted = false;
          if (exclusion.exception_condition) {
            // Check if the exception condition is met (e.g., "antifungal" for cream)
            isExcepted = itemNameLower.includes(exclusion.exception_condition.toLowerCase());
          }

          if (!isExcepted) {
            totalDeducted += lineItem.amount;
            result.deducted_items.push({
              item: lineItem.name,
              reason: `Excluded keyword: ${exclusion.keyword} (${exclusion.category})`,
              amount: lineItem.amount
            });
            break; // Only deduct once per item
          }
        }
      }
    }

    if (totalDeducted > 0) {
      result.approved_amount -= totalDeducted;
      result.validation_steps.push({
        step: 'Keyword Filtering',
        passed: true,
        message: `Deducted Rs. ${totalDeducted.toFixed(2)} for ${result.deducted_items.length} excluded item(s)`
      });
    } else {
      result.validation_steps.push({
        step: 'Keyword Filtering',
        passed: true,
        message: 'No excluded items found'
      });
    }

    // ========== STEP 4: Prescription Validation ==========
    console.log(`[${requestId}] Step 4: Validating prescription`);
    
    const requiresPrescription = ['Pharmacy', 'OPD Drugs', 'OPD'].includes(ocrData.claim_type || '');
    
    if (requiresPrescription && !ocrData.doctor_seal_detected) {
      result.status = 'FLAGGED_FOR_REVIEW';
      result.flagged_items.push('Missing doctor seal/prescription');
      result.validation_steps.push({
        step: 'Prescription Validation',
        passed: false,
        message: 'Missing prescription or doctor seal for pharmacy/OPD drugs claim'
      });
    } else if (requiresPrescription) {
      result.validation_steps.push({
        step: 'Prescription Validation',
        passed: true,
        message: 'Doctor seal/prescription detected'
      });
    } else {
      result.validation_steps.push({
        step: 'Prescription Validation',
        passed: true,
        message: 'Prescription not required for this claim type'
      });
    }

    // ========== STEP 5: Balance Check ==========
    console.log(`[${requestId}] Step 5: Checking remaining balance`);
    
    const claimType = ocrData.claim_type || 'OPD';
    let remainingBalance = 0;
    let limitField = '';
    let usedField = '';

    switch (claimType) {
      case 'Hospitalization':
        remainingBalance = (member.scheme.hospitalization_limit || 0) - (member.hospitalization_used || 0);
        limitField = 'hospitalization_limit';
        usedField = 'hospitalization_used';
        break;
      case 'Dental':
        remainingBalance = (member.scheme.dental_limit || 0) - (member.dental_used || 0);
        limitField = 'dental_limit';
        usedField = 'dental_used';
        break;
      case 'Spectacles':
        remainingBalance = (member.scheme.spectacles_limit || 0) - (member.spectacles_used || 0);
        limitField = 'spectacles_limit';
        usedField = 'spectacles_used';
        break;
      default: // OPD, Pharmacy, OPD Drugs
        remainingBalance = (member.scheme.opd_limit || 0) - (member.opd_used || 0);
        limitField = 'opd_limit';
        usedField = 'opd_used';
    }

    result.balance_info = {
      opd_remaining: (member.scheme.opd_limit || 0) - (member.opd_used || 0),
      hospitalization_remaining: (member.scheme.hospitalization_limit || 0) - (member.hospitalization_used || 0),
      dental_remaining: (member.scheme.dental_limit || 0) - (member.dental_used || 0),
      spectacles_remaining: (member.scheme.spectacles_limit || 0) - (member.spectacles_used || 0)
    };

    if (remainingBalance <= 0) {
      result.status = 'REJECTED';
      result.rejected_reason = `No remaining ${claimType} balance. Annual limit exhausted.`;
      result.approved_amount = 0;
      result.validation_steps.push({
        step: 'Balance Check',
        passed: false,
        message: result.rejected_reason
      });

      console.log(`[${requestId}] Claim rejected - no balance`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (result.approved_amount > remainingBalance) {
      const originalAmount = result.approved_amount;
      result.approved_amount = remainingBalance;
      if (result.status !== 'FLAGGED_FOR_REVIEW') {
        result.status = 'PARTIAL_APPROVAL';
      }
      result.validation_steps.push({
        step: 'Balance Check',
        passed: true,
        message: `Partial approval: Requested Rs. ${originalAmount.toFixed(2)}, remaining balance Rs. ${remainingBalance.toFixed(2)}. Approved: Rs. ${result.approved_amount.toFixed(2)}`
      });
    } else {
      result.validation_steps.push({
        step: 'Balance Check',
        passed: true,
        message: `Sufficient balance. Remaining: Rs. ${remainingBalance.toFixed(2)}`
      });
    }

    // ========== STEP 6: Spectacle Rule Check ==========
    console.log(`[${requestId}] Step 6: Checking spectacle claim rules`);
    
    const hasSpectacleItems = ocrData.line_items.some(item => {
      const nameLower = item.name.toLowerCase();
      return nameLower.includes('spectacle') || 
             nameLower.includes('lens') || 
             nameLower.includes('glasses') ||
             nameLower.includes('eyeglass') ||
             nameLower.includes('frame');
    }) || claimType === 'Spectacles';

    if (hasSpectacleItems && member.last_spectacle_claim_date) {
      const lastSpectacleClaim = new Date(member.last_spectacle_claim_date);
      const intervalYears = member.corporate_policy.spectacle_claim_interval_years || 2;
      const nextEligibleDate = new Date(lastSpectacleClaim);
      nextEligibleDate.setFullYear(nextEligibleDate.getFullYear() + intervalYears);

      if (currentDate < nextEligibleDate) {
        const yearsRemaining = ((nextEligibleDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
        result.status = 'REJECTED';
        result.rejected_reason = `Spectacles can only be claimed once every ${intervalYears} years. Last claimed: ${lastSpectacleClaim.toISOString().split('T')[0]}. Next eligible: ${nextEligibleDate.toISOString().split('T')[0]} (${yearsRemaining} years remaining)`;
        result.approved_amount = 0;
        result.validation_steps.push({
          step: 'Spectacle Rule',
          passed: false,
          message: result.rejected_reason
        });

        console.log(`[${requestId}] Claim rejected - spectacle interval not met`);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (hasSpectacleItems) {
      result.validation_steps.push({
        step: 'Spectacle Rule',
        passed: true,
        message: member.last_spectacle_claim_date 
          ? `Spectacle claim eligible. Last claim: ${member.last_spectacle_claim_date}` 
          : 'No previous spectacle claims found'
      });
    } else {
      result.validation_steps.push({
        step: 'Spectacle Rule',
        passed: true,
        message: 'No spectacle items in claim'
      });
    }

    // ========== Final Status Determination ==========
    if (result.approved_amount <= 0) {
      result.status = 'REJECTED';
      result.rejected_reason = result.rejected_reason || 'Claim amount reduced to zero after deductions';
    } else if (result.flagged_items.length > 0 && result.status !== 'PARTIAL_APPROVAL') {
      result.status = 'FLAGGED_FOR_REVIEW';
    }

    console.log(`[${requestId}] Validation complete. Status: ${result.status}, Approved: Rs. ${result.approved_amount}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Error in validation:`, error);
    return new Response(
      JSON.stringify({
        status: 'REJECTED',
        approved_amount: 0,
        rejected_reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flagged_items: [],
        deducted_items: [],
        balance_info: null,
        validation_steps: [{
          step: 'System Error',
          passed: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
