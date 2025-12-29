-- Create institutions table
CREATE TABLE public.institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  welcome_text TEXT DEFAULT 'Welcome to our verification portal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Add institution_id to index_records
ALTER TABLE public.index_records ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

-- Add institution_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

-- Add institution_id to verification_logs
ALTER TABLE public.verification_logs ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

-- Add institution_id to profiles
ALTER TABLE public.profiles ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Create function to check super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create function to get user's institution_id
CREATE OR REPLACE FUNCTION public.get_user_institution(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for institutions
CREATE POLICY "Super admins can manage all institutions"
ON public.institutions
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Institution admins can view their institution"
ON public.institutions
FOR SELECT
USING (
  id IN (
    SELECT institution_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can view institutions for login"
ON public.institutions
FOR SELECT
USING (true);

-- Update index_records policies to scope by institution
DROP POLICY IF EXISTS "Admins can delete records" ON public.index_records;
DROP POLICY IF EXISTS "Admins can insert records" ON public.index_records;
DROP POLICY IF EXISTS "Admins can update records" ON public.index_records;
DROP POLICY IF EXISTS "Admins can view all records" ON public.index_records;
DROP POLICY IF EXISTS "Authenticated users can view verified records" ON public.index_records;

CREATE POLICY "Super admins can manage all records"
ON public.index_records
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Institution admins can manage their records"
ON public.index_records
FOR ALL
USING (
  institution_id = public.get_user_institution(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can view verified records in their institution"
ON public.index_records
FOR SELECT
USING (
  status = 'verified'
  AND institution_id = public.get_user_institution(auth.uid())
);

-- Update verification_logs policies
DROP POLICY IF EXISTS "Admins can view all verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Authenticated users can insert verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Users can view their own verification logs" ON public.verification_logs;

CREATE POLICY "Super admins can view all logs"
ON public.verification_logs
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Institution admins can view their logs"
ON public.verification_logs
FOR SELECT
USING (
  institution_id = public.get_user_institution(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert verification logs"
ON public.verification_logs
FOR INSERT
WITH CHECK (auth.uid() = verified_by);

CREATE POLICY "Users can view their own logs"
ON public.verification_logs
FOR SELECT
USING (auth.uid() = verified_by);

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Institution admins can view roles in their institution"
ON public.user_roles
FOR SELECT
USING (
  institution_id = public.get_user_institution(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for institutions updated_at
CREATE TRIGGER update_institutions_updated_at
BEFORE UPDATE ON public.institutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();