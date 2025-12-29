-- Create storage bucket for institution logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('institution-logos', 'institution-logos', true);

-- Storage policies for institution logos
CREATE POLICY "Anyone can view institution logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'institution-logos');

CREATE POLICY "Institution admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'institution-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Institution admins can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'institution-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Institution admins can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'institution-logos' AND auth.uid() IS NOT NULL);

-- Add verification settings to institutions
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS require_photo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enforce_expiry BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_public_verification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- Create staff_roles enum for different staff types
CREATE TYPE public.staff_role AS ENUM ('verifier', 'registrar', 'security', 'viewer');

-- Add staff_type to user_roles for more granular control
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS staff_type staff_role;