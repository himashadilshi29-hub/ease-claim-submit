-- Extend claim_type enum to include hospitalization
ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'hospitalization';

-- Create hospitalization type enum
CREATE TYPE hospitalization_type AS ENUM ('cashless', 'reimbursement', 'per_day_benefit');

-- Create policy type enum
CREATE TYPE policy_type AS ENUM ('retail', 'corporate');

-- Create document type enum for AI classification
CREATE TYPE ai_document_type AS ENUM (
  'claim_form', 
  'medical_bill', 
  'prescription', 
  'diagnosis_card', 
  'admission_card', 
  'payment_receipt',
  'discharge_summary',
  'lab_report',
  'other'
);

-- Create processing status enum
CREATE TYPE processing_status AS ENUM (
  'uploaded',
  'ocr_processing',
  'ocr_complete',
  'ocr_failed',
  'reupload_required',
  'classification_complete',
  'validation_in_progress',
  'validation_complete',
  'fraud_check_in_progress',
  'fraud_check_complete',
  'pending_documents',
  'manual_review',
  'auto_approved',
  'auto_rejected',
  'settlement_pending',
  'settled',
  'closed'
);

-- Create policies table
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_number TEXT NOT NULL UNIQUE,
  policy_type policy_type NOT NULL,
  holder_name TEXT NOT NULL,
  holder_nic TEXT NOT NULL,
  hospitalization_limit NUMERIC DEFAULT 0,
  opd_limit NUMERIC DEFAULT 0,
  annual_top_up NUMERIC DEFAULT 0,
  no_claim_bonus NUMERIC DEFAULT 0,
  floater_limit NUMERIC DEFAULT 0,
  co_payment_percentage NUMERIC DEFAULT 0,
  deductible_amount NUMERIC DEFAULT 0,
  room_category TEXT,
  warranty_period_days INTEGER DEFAULT 30,
  policy_start_date DATE NOT NULL,
  policy_end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  exclusions JSONB DEFAULT '[]'::jsonb,
  special_covers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create policy members table
CREATE TABLE public.policy_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_nic TEXT,
  relationship relationship_type NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  is_primary BOOLEAN DEFAULT false,
  bank_name TEXT,
  account_number TEXT,
  mobile_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medicine database table
CREATE TABLE public.medicine_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  category TEXT,
  is_covered BOOLEAN DEFAULT true,
  is_cosmetic BOOLEAN DEFAULT false,
  is_vitamin BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create disease-medicine mapping table
CREATE TABLE public.disease_medicine_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_name TEXT NOT NULL,
  disease_keywords TEXT[],
  recommended_medicines TEXT[],
  excluded_medicines TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create OCR results table
CREATE TABLE public.claim_ocr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.claim_documents(id) ON DELETE CASCADE,
  document_type ai_document_type,
  ocr_confidence INTEGER DEFAULT 0,
  language_detected TEXT,
  is_handwritten BOOLEAN DEFAULT false,
  raw_text TEXT,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  ai_keywords_found TEXT[],
  reupload_attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  manual_verification_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create claim validations table
CREATE TABLE public.claim_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  detected_claim_type claim_type,
  mandatory_documents_status JSONB DEFAULT '{}'::jsonb,
  missing_documents TEXT[],
  policy_verified BOOLEAN DEFAULT false,
  member_verified BOOLEAN DEFAULT false,
  coverage_details JSONB DEFAULT '{}'::jsonb,
  exclusions_found TEXT[],
  previous_claims_total NUMERIC DEFAULT 0,
  remaining_coverage NUMERIC DEFAULT 0,
  max_payable_amount NUMERIC DEFAULT 0,
  co_payment_amount NUMERIC DEFAULT 0,
  prescription_diagnosis_score NUMERIC DEFAULT 0,
  prescription_bill_score NUMERIC DEFAULT 0,
  diagnosis_treatment_score NUMERIC DEFAULT 0,
  billing_policy_score NUMERIC DEFAULT 0,
  overall_validation_score NUMERIC DEFAULT 0,
  validation_issues TEXT[],
  workflow_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fraud detection results table
CREATE TABLE public.fraud_detection_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  duplicate_hash_match BOOLEAN DEFAULT false,
  duplicate_content_match BOOLEAN DEFAULT false,
  duplicate_similarity_score NUMERIC DEFAULT 0,
  duplicate_claim_ids UUID[],
  anomaly_score NUMERIC DEFAULT 0,
  fraud_score NUMERIC DEFAULT 0,
  alerts TEXT[],
  amount_deviation_percentage NUMERIC DEFAULT 0,
  stay_deviation_days NUMERIC DEFAULT 0,
  provider_claim_frequency INTEGER DEFAULT 0,
  historical_baseline JSONB DEFAULT '{}'::jsonb,
  llm_analysis TEXT,
  workflow_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settlement calculations table
CREATE TABLE public.settlement_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  validated_billed_total NUMERIC DEFAULT 0,
  covered_items JSONB DEFAULT '[]'::jsonb,
  non_covered_items JSONB DEFAULT '[]'::jsonb,
  policy_limit NUMERIC DEFAULT 0,
  previous_claims_total NUMERIC DEFAULT 0,
  remaining_coverage NUMERIC DEFAULT 0,
  max_payable_amount NUMERIC DEFAULT 0,
  co_payment_percentage NUMERIC DEFAULT 0,
  co_payment_amount NUMERIC DEFAULT 0,
  deductible_amount NUMERIC DEFAULT 0,
  insurer_payment NUMERIC DEFAULT 0,
  decision TEXT,
  decision_reason TEXT,
  approval_letter_generated BOOLEAN DEFAULT false,
  settlement_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alter claims table to add new columns
ALTER TABLE public.claims 
  ADD COLUMN IF NOT EXISTS hospitalization_type hospitalization_type,
  ADD COLUMN IF NOT EXISTS processing_status processing_status DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.policies(id),
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.policy_members(id),
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS discharge_date DATE,
  ADD COLUMN IF NOT EXISTS hospital_name TEXT,
  ADD COLUMN IF NOT EXISTS doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS doctor_slmc_no TEXT,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS procedure_name TEXT,
  ADD COLUMN IF NOT EXISTS room_category TEXT,
  ADD COLUMN IF NOT EXISTS bill_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settled_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS documents_pending_deadline TIMESTAMPTZ;

-- Enable RLS on new tables
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_medicine_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policies table
CREATE POLICY "Admins can manage all policies" ON public.policies
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view policies" ON public.policies
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

CREATE POLICY "Customers can view their policies" ON public.policies
  FOR SELECT USING (holder_nic IN (
    SELECT nic FROM public.profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for policy_members table
CREATE POLICY "Admins can manage all members" ON public.policy_members
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view members" ON public.policy_members
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

CREATE POLICY "Customers can view their policy members" ON public.policy_members
  FOR SELECT USING (policy_id IN (
    SELECT id FROM public.policies WHERE holder_nic IN (
      SELECT nic FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

-- RLS Policies for medicine_database (public read, admin write)
CREATE POLICY "Anyone can view medicines" ON public.medicine_database
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage medicines" ON public.medicine_database
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for disease_medicine_mapping (public read, admin write)
CREATE POLICY "Anyone can view disease mappings" ON public.disease_medicine_mapping
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage disease mappings" ON public.disease_medicine_mapping
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for claim_ocr_results
CREATE POLICY "Admins can view all OCR results" ON public.claim_ocr_results
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view all OCR results" ON public.claim_ocr_results
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

CREATE POLICY "Users can view their claim OCR results" ON public.claim_ocr_results
  FOR SELECT USING (claim_id IN (
    SELECT id FROM public.claims WHERE user_id = auth.uid()
  ));

-- RLS Policies for claim_validations
CREATE POLICY "Admins can manage all validations" ON public.claim_validations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view validations" ON public.claim_validations
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

CREATE POLICY "Users can view their claim validations" ON public.claim_validations
  FOR SELECT USING (claim_id IN (
    SELECT id FROM public.claims WHERE user_id = auth.uid()
  ));

-- RLS Policies for fraud_detection_results
CREATE POLICY "Admins can manage all fraud results" ON public.fraud_detection_results
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view fraud results" ON public.fraud_detection_results
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

-- RLS Policies for settlement_calculations
CREATE POLICY "Admins can manage all settlements" ON public.settlement_calculations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch staff can view settlements" ON public.settlement_calculations
  FOR SELECT USING (has_role(auth.uid(), 'branch'));

CREATE POLICY "Users can view their settlements" ON public.settlement_calculations
  FOR SELECT USING (claim_id IN (
    SELECT id FROM public.claims WHERE user_id = auth.uid()
  ));

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claim_validations_updated_at
  BEFORE UPDATE ON public.claim_validations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settlement_calculations_updated_at
  BEFORE UPDATE ON public.settlement_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample medicine data
INSERT INTO public.medicine_database (brand_name, generic_name, category, is_covered, is_vitamin, is_cosmetic) VALUES
('Panadol', 'Paracetamol', 'Analgesic', true, false, false),
('Disprin', 'Aspirin', 'Analgesic', true, false, false),
('Brufen', 'Ibuprofen', 'NSAID', true, false, false),
('Augmentin', 'Amoxicillin + Clavulanic Acid', 'Antibiotic', true, false, false),
('Amoxil', 'Amoxicillin', 'Antibiotic', true, false, false),
('Zithromax', 'Azithromycin', 'Antibiotic', true, false, false),
('Omeprazole', 'Omeprazole', 'PPI', true, false, false),
('Losec', 'Omeprazole', 'PPI', true, false, false),
('Metformin', 'Metformin', 'Antidiabetic', true, false, false),
('Glucophage', 'Metformin', 'Antidiabetic', true, false, false),
('Crocin', 'Paracetamol', 'Analgesic', true, false, false),
('Centrum', 'Multivitamin', 'Vitamin', false, true, false),
('Vitamin C 500mg', 'Ascorbic Acid', 'Vitamin', false, true, false),
('Vitamin D3', 'Cholecalciferol', 'Vitamin', false, true, false),
('Biotin', 'Biotin', 'Vitamin', false, true, false),
('Retinol Cream', 'Retinoid', 'Cosmetic', false, false, true),
('Botox', 'Botulinum Toxin', 'Cosmetic', false, false, true);

-- Insert sample disease-medicine mappings
INSERT INTO public.disease_medicine_mapping (disease_name, disease_keywords, recommended_medicines, excluded_medicines) VALUES
('Fever', ARRAY['fever', 'pyrexia', 'temperature', 'flu', 'influenza'], ARRAY['Paracetamol', 'Ibuprofen', 'Aspirin'], ARRAY[]::TEXT[]),
('Bacterial Infection', ARRAY['infection', 'bacterial', 'sepsis'], ARRAY['Amoxicillin', 'Azithromycin', 'Cephalosporin'], ARRAY[]::TEXT[]),
('Gastritis', ARRAY['gastritis', 'acidity', 'ulcer', 'GERD'], ARRAY['Omeprazole', 'Pantoprazole', 'Ranitidine'], ARRAY[]::TEXT[]),
('Diabetes', ARRAY['diabetes', 'diabetic', 'blood sugar', 'hyperglycemia'], ARRAY['Metformin', 'Glibenclamide', 'Insulin'], ARRAY[]::TEXT[]),
('Hypertension', ARRAY['hypertension', 'high blood pressure', 'BP'], ARRAY['Amlodipine', 'Losartan', 'Atenolol'], ARRAY[]::TEXT[]),
('Pain Management', ARRAY['pain', 'ache', 'arthritis', 'injury'], ARRAY['Paracetamol', 'Ibuprofen', 'Diclofenac'], ARRAY[]::TEXT[]);

-- Insert sample policies
INSERT INTO public.policies (policy_number, policy_type, holder_name, holder_nic, hospitalization_limit, opd_limit, warranty_period_days, policy_start_date, policy_end_date, room_category, co_payment_percentage) VALUES
('POL-2024-001', 'retail', 'Kumara Perera', '199012345678', 500000, 50000, 30, '2024-01-01', '2024-12-31', 'General Ward', 10),
('POL-2024-002', 'retail', 'Nimal Silva', '198523456789', 750000, 75000, 30, '2024-01-01', '2024-12-31', 'Semi-Private', 5),
('POL-2024-003', 'corporate', 'ABC Company', '200145678901', 1000000, 100000, 45, '2024-01-01', '2024-12-31', 'Private', 0);

-- Insert sample policy members
INSERT INTO public.policy_members (policy_id, member_name, member_nic, relationship, is_primary, bank_name, account_number, mobile_number) 
SELECT id, 'Kumara Perera', '199012345678', 'self', true, 'Bank of Ceylon', '1234567890', '0771234567'
FROM public.policies WHERE policy_number = 'POL-2024-001';

INSERT INTO public.policy_members (policy_id, member_name, member_nic, relationship, is_primary, bank_name, account_number, mobile_number) 
SELECT id, 'Malini Perera', '199234567890', 'spouse', false, 'Bank of Ceylon', '1234567890', '0777654321'
FROM public.policies WHERE policy_number = 'POL-2024-001';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON public.policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_holder_nic ON public.policies(holder_nic);
CREATE INDEX IF NOT EXISTS idx_policy_members_policy_id ON public.policy_members(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_members_nic ON public.policy_members(member_nic);
CREATE INDEX IF NOT EXISTS idx_medicine_database_brand ON public.medicine_database(brand_name);
CREATE INDEX IF NOT EXISTS idx_medicine_database_generic ON public.medicine_database(generic_name);
CREATE INDEX IF NOT EXISTS idx_claim_ocr_results_claim_id ON public.claim_ocr_results(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_validations_claim_id ON public.claim_validations(claim_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_claim_id ON public.fraud_detection_results(claim_id);
CREATE INDEX IF NOT EXISTS idx_settlement_calculations_claim_id ON public.settlement_calculations(claim_id);
CREATE INDEX IF NOT EXISTS idx_claims_processing_status ON public.claims(processing_status);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON public.claims(policy_id);