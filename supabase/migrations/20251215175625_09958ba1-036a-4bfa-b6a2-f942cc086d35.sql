-- Fix security issues: Restrict all policies to authenticated users only

-- Drop and recreate claims policies to target authenticated role
DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Branch staff can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Users can create their own claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can update any claim" ON public.claims;
DROP POLICY IF EXISTS "Branch staff can update any claim" ON public.claims;

CREATE POLICY "Users can view their own claims" ON public.claims
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims" ON public.claims
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all claims" ON public.claims
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'branch'));

CREATE POLICY "Users can create their own claims" ON public.claims
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any claim" ON public.claims
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can update any claim" ON public.claims
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'branch'));

-- Drop and recreate profiles policies to target authenticated role
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate claim_documents policies to target authenticated role
DROP POLICY IF EXISTS "Users can view their claim documents" ON public.claim_documents;
DROP POLICY IF EXISTS "Admins can view all claim documents" ON public.claim_documents;
DROP POLICY IF EXISTS "Branch staff can view all claim documents" ON public.claim_documents;
DROP POLICY IF EXISTS "Users can upload documents to their claims" ON public.claim_documents;

CREATE POLICY "Users can view their claim documents" ON public.claim_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM claims
  WHERE claims.id = claim_documents.claim_id AND claims.user_id = auth.uid()
));

CREATE POLICY "Admins can view all claim documents" ON public.claim_documents
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all claim documents" ON public.claim_documents
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'branch'));

CREATE POLICY "Users can upload documents to their claims" ON public.claim_documents
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM claims
  WHERE claims.id = claim_documents.claim_id AND claims.user_id = auth.uid()
));