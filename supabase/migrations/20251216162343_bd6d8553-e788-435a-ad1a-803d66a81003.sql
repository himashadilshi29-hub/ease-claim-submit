-- Drop the public SELECT policy on medicine_database
DROP POLICY IF EXISTS "Anyone can view medicines" ON public.medicine_database;

-- Create restricted policies for staff access only
CREATE POLICY "Staff can view medicines"
ON public.medicine_database
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_portal) OR 
  has_role(auth.uid(), 'branch'::user_portal)
);