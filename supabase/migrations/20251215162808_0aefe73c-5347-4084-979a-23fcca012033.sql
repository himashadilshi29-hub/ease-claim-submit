-- Create enum for claim types
CREATE TYPE public.claim_type AS ENUM ('opd', 'spectacles', 'dental');

-- Create enum for claim status
CREATE TYPE public.claim_status AS ENUM ('pending', 'processing', 'approved', 'rejected', 'manual-review');

-- Create enum for relationship types
CREATE TYPE public.relationship_type AS ENUM ('self', 'spouse', 'child', 'parent');

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  claim_type claim_type NOT NULL,
  relationship relationship_type NOT NULL,
  
  -- Contact info
  mobile_number TEXT,
  
  -- Bank details
  bank_name TEXT,
  account_number TEXT,
  
  -- Treatment details
  date_of_treatment DATE,
  diagnosis TEXT,
  claim_amount DECIMAL(12,2) NOT NULL,
  
  -- AI Processing results
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  fraud_status TEXT DEFAULT 'clean',
  fraud_flags INTEGER DEFAULT 0,
  ocr_confidence INTEGER DEFAULT 0,
  ocr_level TEXT DEFAULT 'low',
  
  -- Status and notes
  status claim_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create claim_documents table
CREATE TABLE public.claim_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  ocr_extracted_text TEXT,
  ocr_confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claim_history table for audit trail
CREATE TABLE public.claim_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status claim_status,
  new_status claim_status,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;

-- Claims policies
CREATE POLICY "Users can view their own claims"
ON public.claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims"
ON public.claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
ON public.claims FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all claims"
ON public.claims FOR SELECT
USING (public.has_role(auth.uid(), 'branch'));

CREATE POLICY "Admins can update any claim"
ON public.claims FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can update any claim"
ON public.claims FOR UPDATE
USING (public.has_role(auth.uid(), 'branch'));

-- Claim documents policies
CREATE POLICY "Users can view their claim documents"
ON public.claim_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.claims 
    WHERE claims.id = claim_documents.claim_id 
    AND claims.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload documents to their claims"
ON public.claim_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.claims 
    WHERE claims.id = claim_documents.claim_id 
    AND claims.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all claim documents"
ON public.claim_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all claim documents"
ON public.claim_documents FOR SELECT
USING (public.has_role(auth.uid(), 'branch'));

-- Claim history policies
CREATE POLICY "Users can view their claim history"
ON public.claim_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.claims 
    WHERE claims.id = claim_history.claim_id 
    AND claims.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert claim history"
ON public.claim_history FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'branch')
);

CREATE POLICY "Admins can view all claim history"
ON public.claim_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all claim history"
ON public.claim_history FOR SELECT
USING (public.has_role(auth.uid(), 'branch'));

-- Trigger to update updated_at
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for claim documents
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-documents', 'claim-documents', false);

-- Storage policies
CREATE POLICY "Users can upload claim documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'claim-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their claim documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'claim-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Staff can view all claim documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'claim-documents' 
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'branch'))
);

-- Function to generate claim reference number
CREATE OR REPLACE FUNCTION public.generate_claim_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.reference_number := 'CR' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate reference number
CREATE TRIGGER set_claim_reference
BEFORE INSERT ON public.claims
FOR EACH ROW
WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
EXECUTE FUNCTION public.generate_claim_reference();