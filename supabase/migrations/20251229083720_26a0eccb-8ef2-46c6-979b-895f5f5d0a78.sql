-- Create corporate_policies table for company-level policy information
CREATE TABLE public.corporate_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text NOT NULL UNIQUE,
  company_name text NOT NULL,
  policy_start_date date NOT NULL,
  policy_end_date date NOT NULL,
  is_active boolean DEFAULT true,
  claim_submission_deadline_days integer DEFAULT 90,
  spectacle_claim_interval_years integer DEFAULT 2,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create corporate_policy_schemes table for scheme-level limits
CREATE TABLE public.corporate_policy_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_policy_id uuid NOT NULL REFERENCES public.corporate_policies(id) ON DELETE CASCADE,
  scheme_name text NOT NULL,
  hospitalization_limit numeric DEFAULT 0,
  opd_limit numeric DEFAULT 0,
  dental_limit numeric DEFAULT 0,
  spectacles_limit numeric DEFAULT 0,
  annual_limit numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(corporate_policy_id, scheme_name)
);

-- Create corporate_policy_members table to link employees to schemes
CREATE TABLE public.corporate_policy_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_policy_id uuid NOT NULL REFERENCES public.corporate_policies(id) ON DELETE CASCADE,
  scheme_id uuid NOT NULL REFERENCES public.corporate_policy_schemes(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_nic text,
  employee_id_number text,
  date_of_birth date,
  relationship text DEFAULT 'self',
  is_active boolean DEFAULT true,
  hospitalization_used numeric DEFAULT 0,
  opd_used numeric DEFAULT 0,
  dental_used numeric DEFAULT 0,
  spectacles_used numeric DEFAULT 0,
  last_spectacle_claim_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create claim_exclusion_keywords table for blacklisted items
CREATE TABLE public.claim_exclusion_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  category text NOT NULL,
  exception_condition text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.corporate_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_policy_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_policy_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_exclusion_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for corporate_policies
CREATE POLICY "Admins can manage all corporate policies"
ON public.corporate_policies FOR ALL
USING (has_role(auth.uid(), 'admin'::user_portal));

CREATE POLICY "Branch staff can view corporate policies"
ON public.corporate_policies FOR SELECT
USING (has_role(auth.uid(), 'branch'::user_portal));

-- RLS Policies for corporate_policy_schemes
CREATE POLICY "Admins can manage all schemes"
ON public.corporate_policy_schemes FOR ALL
USING (has_role(auth.uid(), 'admin'::user_portal));

CREATE POLICY "Branch staff can view schemes"
ON public.corporate_policy_schemes FOR SELECT
USING (has_role(auth.uid(), 'branch'::user_portal));

-- RLS Policies for corporate_policy_members
CREATE POLICY "Admins can manage all members"
ON public.corporate_policy_members FOR ALL
USING (has_role(auth.uid(), 'admin'::user_portal));

CREATE POLICY "Branch staff can view and update members"
ON public.corporate_policy_members FOR SELECT
USING (has_role(auth.uid(), 'branch'::user_portal));

CREATE POLICY "Branch staff can update member balances"
ON public.corporate_policy_members FOR UPDATE
USING (has_role(auth.uid(), 'branch'::user_portal));

-- RLS Policies for claim_exclusion_keywords
CREATE POLICY "Admins can manage exclusion keywords"
ON public.claim_exclusion_keywords FOR ALL
USING (has_role(auth.uid(), 'admin'::user_portal));

CREATE POLICY "Staff can view exclusion keywords"
ON public.claim_exclusion_keywords FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_portal) OR has_role(auth.uid(), 'branch'::user_portal));

-- Create trigger for updated_at
CREATE TRIGGER update_corporate_policies_updated_at
BEFORE UPDATE ON public.corporate_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_corporate_policy_members_updated_at
BEFORE UPDATE ON public.corporate_policy_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 4 corporate policies
INSERT INTO public.corporate_policies (policy_number, company_name, policy_start_date, policy_end_date, spectacle_claim_interval_years) VALUES
('JSV2023-2476', 'Noyon Lanka (Pvt) Ltd', '2023-01-01', '2025-12-31', 2),
('JSV2025-1176', 'Avery Dennison Lanka (Pvt) Ltd', '2025-01-01', '2025-12-31', 2),
('JSV2025-1525', 'East West Properties', '2025-01-01', '2025-12-31', 2),
('JSV2025-1216', 'Lankem Ceylon PLC', '2025-01-01', '2025-12-31', 2);

-- Insert schemes for Noyon Lanka
INSERT INTO public.corporate_policy_schemes (corporate_policy_id, scheme_name, hospitalization_limit, opd_limit, spectacles_limit)
SELECT id, 'Scheme 1', 275000, 15000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2023-2476'
UNION ALL
SELECT id, 'Scheme 2', 250000, 15000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2023-2476'
UNION ALL
SELECT id, 'Scheme 3', 225000, 15000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2023-2476'
UNION ALL
SELECT id, 'Scheme 4', 175000, 15000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2023-2476';

-- Insert schemes for Avery Dennison
INSERT INTO public.corporate_policy_schemes (corporate_policy_id, scheme_name, hospitalization_limit, opd_limit, dental_limit, spectacles_limit)
SELECT id, 'Scheme 01', 1000000, 77000, 25000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176'
UNION ALL
SELECT id, 'Scheme 02', 750000, 38000, 25000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176'
UNION ALL
SELECT id, 'Scheme 03', 500000, 27000, 25000, 30000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176'
UNION ALL
SELECT id, 'Scheme 04', 275000, 19000, 10000, 10000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176'
UNION ALL
SELECT id, 'Scheme 05', 230000, 14000, 10000, 10000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176'
UNION ALL
SELECT id, 'Scheme 06', 160000, 8000, 8000, 8000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1176';

-- Insert scheme for East West Properties
INSERT INTO public.corporate_policy_schemes (corporate_policy_id, scheme_name, hospitalization_limit, opd_limit, spectacles_limit)
SELECT id, 'Option 1', 300000, 20500, 15000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1525';

-- Insert schemes for Lankem Ceylon PLC
INSERT INTO public.corporate_policy_schemes (corporate_policy_id, scheme_name, hospitalization_limit, dental_limit, spectacles_limit)
SELECT id, 'Option 1', 300000, 5000, 25000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1216'
UNION ALL
SELECT id, 'Option 2', 200000, 5000, 20000 FROM public.corporate_policies WHERE policy_number = 'JSV2025-1216';

-- Insert exclusion keywords based on Janashakthi General Conditions
INSERT INTO public.claim_exclusion_keywords (keyword, category, exception_condition) VALUES
('shampoo', 'cosmetic', NULL),
('soap', 'cosmetic', NULL),
('cream', 'cosmetic', 'antifungal'),
('face wash', 'cosmetic', NULL),
('cosmetic', 'cosmetic', NULL),
('vitamin', 'supplement', 'pregnancy'),
('supplement', 'supplement', NULL),
('food', 'nutrition', NULL),
('registration fee', 'administrative', NULL),
('tonic', 'supplement', NULL),
('nutritional supplement', 'supplement', NULL),
('weight loss', 'excluded_treatment', NULL),
('slimming', 'excluded_treatment', NULL),
('beauty', 'cosmetic', NULL),
('lotion', 'cosmetic', 'medicated'),
('moisturizer', 'cosmetic', NULL),
('sunscreen', 'cosmetic', NULL),
('hair fall', 'excluded_treatment', NULL),
('alopecia', 'excluded_treatment', NULL),
('acne', 'excluded_treatment', NULL),
('service charge', 'administrative', NULL),
('surcharge', 'administrative', NULL),
('booking fee', 'administrative', NULL),
('reservation', 'administrative', NULL),
('refund charge', 'administrative', NULL);