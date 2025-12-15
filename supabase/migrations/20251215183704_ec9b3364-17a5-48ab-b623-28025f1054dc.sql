-- Drop existing storage policies and recreate with claim ownership verification
DROP POLICY IF EXISTS "Users can upload claim documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their claim documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view all claim documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload claim documents" ON storage.objects;

-- Create policy for users to upload documents to their own claims
CREATE POLICY "Users can upload to their claim folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-documents'
  AND EXISTS (
    SELECT 1 FROM public.claims 
    WHERE id::text = (storage.foldername(name))[1] 
    AND user_id = auth.uid()
  )
);

-- Create policy for staff (admin/branch) to upload documents
CREATE POLICY "Staff can upload claim documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_portal) OR 
    public.has_role(auth.uid(), 'branch'::public.user_portal)
  )
);

-- Create policy for users to view their own claim documents
CREATE POLICY "Users can view their claim documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-documents'
  AND EXISTS (
    SELECT 1 FROM public.claims 
    WHERE id::text = (storage.foldername(name))[1] 
    AND user_id = auth.uid()
  )
);

-- Create policy for staff to view all claim documents
CREATE POLICY "Staff can view all claim documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_portal) OR 
    public.has_role(auth.uid(), 'branch'::public.user_portal)
  )
);

-- Create policy for users to delete their own claim documents
CREATE POLICY "Users can delete their claim documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-documents'
  AND EXISTS (
    SELECT 1 FROM public.claims 
    WHERE id::text = (storage.foldername(name))[1] 
    AND user_id = auth.uid()
  )
);

-- Create policy for staff to delete claim documents
CREATE POLICY "Staff can delete claim documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_portal) OR 
    public.has_role(auth.uid(), 'branch'::public.user_portal)
  )
);

-- Update handle_new_user function to validate portal type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_portal_type user_portal;
  raw_portal_value text;
BEGIN
  -- Get raw portal value from metadata
  raw_portal_value := new.raw_user_meta_data->>'portal';
  
  -- Validate portal type - only allow known values, default to 'customer'
  IF raw_portal_value IS NOT NULL AND raw_portal_value IN ('admin', 'branch', 'customer') THEN
    user_portal_type := raw_portal_value::user_portal;
  ELSE
    user_portal_type := 'customer';
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name, email, nic, portal)
  VALUES (
    new.id, 
    COALESCE(LEFT(new.raw_user_meta_data->>'full_name', 255), ''),
    new.email,
    LEFT(new.raw_user_meta_data->>'nic', 20),
    user_portal_type
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_portal_type);
  
  RETURN new;
END;
$$;