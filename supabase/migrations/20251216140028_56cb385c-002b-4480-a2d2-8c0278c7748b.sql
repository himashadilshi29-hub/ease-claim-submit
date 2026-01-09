-- Add explicit deny policies for anonymous users on all sensitive tables
-- This provides defense-in-depth even though restrictive policies are already in place

-- claims table
CREATE POLICY "Deny anonymous access to claims"
ON public.claims
FOR ALL TO anon
USING (false);

-- claim_documents table  
CREATE POLICY "Deny anonymous access to claim_documents"
ON public.claim_documents
FOR ALL TO anon
USING (false);

-- claim_history table
CREATE POLICY "Deny anonymous access to claim_history"
ON public.claim_history
FOR ALL TO anon
USING (false);

-- claim_ocr_results table
CREATE POLICY "Deny anonymous access to claim_ocr_results"
ON public.claim_ocr_results
FOR ALL TO anon
USING (false);

-- claim_validations table
CREATE POLICY "Deny anonymous access to claim_validations"
ON public.claim_validations
FOR ALL TO anon
USING (false);

-- fraud_detection_results table
CREATE POLICY "Deny anonymous access to fraud_detection_results"
ON public.fraud_detection_results
FOR ALL TO anon
USING (false);

-- settlement_calculations table
CREATE POLICY "Deny anonymous access to settlement_calculations"
ON public.settlement_calculations
FOR ALL TO anon
USING (false);

-- profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL TO anon
USING (false);

-- user_roles table
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL TO anon
USING (false);

-- policies table (insurance policies)
CREATE POLICY "Deny anonymous access to policies"
ON public.policies
FOR ALL TO anon
USING (false);

-- policy_members table
CREATE POLICY "Deny anonymous access to policy_members"
ON public.policy_members
FOR ALL TO anon
USING (false);