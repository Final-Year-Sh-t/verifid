-- Add is_active column
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Set is_active for rows that have institution_id, only one per user should be active
-- For rows without institution_id (like super_admin), set is_active = false
UPDATE public.user_roles 
SET is_active = CASE 
  WHEN institution_id IS NOT NULL THEN true 
  ELSE false 
END;

-- Make is_active NOT NULL
ALTER TABLE public.user_roles ALTER COLUMN is_active SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON public.user_roles(user_id, is_active);

-- Create unique constraint: only one active institution per user (only for rows with is_active = true)
CREATE UNIQUE INDEX idx_user_roles_one_active ON public.user_roles(user_id) WHERE is_active = true;

-- Create unique constraint: user can only have one role per institution (if institution is not null)
CREATE UNIQUE INDEX idx_user_roles_user_institution_unique ON public.user_roles(user_id, institution_id) WHERE institution_id IS NOT NULL;

-- Update get_user_institution to return the ACTIVE institution
CREATE OR REPLACE FUNCTION public.get_user_institution(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id
  FROM public.user_roles
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Create function to get all user institutions
CREATE OR REPLACE FUNCTION public.get_user_institutions(_user_id uuid)
RETURNS TABLE (
  institution_id uuid,
  institution_name text,
  institution_slug text,
  role app_role,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    ur.role,
    ur.is_active
  FROM public.user_roles ur
  JOIN public.institutions i ON i.id = ur.institution_id
  WHERE ur.user_id = _user_id AND ur.institution_id IS NOT NULL
  ORDER BY ur.is_active DESC, i.name ASC
$$;

-- Create function to switch active institution
CREATE OR REPLACE FUNCTION public.switch_active_institution(_institution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND institution_id = _institution_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this institution';
  END IF;

  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = auth.uid();

  UPDATE public.user_roles
  SET is_active = true
  WHERE user_id = auth.uid() AND institution_id = _institution_id;

  UPDATE public.profiles
  SET institution_id = _institution_id
  WHERE user_id = auth.uid();
END;
$$;

-- Update create_institution_for_current_user to support multi-membership
CREATE OR REPLACE FUNCTION public.create_institution_for_current_user(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  new_slug text;
  new_institution_id uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Institution name is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  base_slug := regexp_replace(lower(trim(_name)), '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]', '', 'g');
  new_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.institutions (name, slug, welcome_text)
  VALUES (trim(_name), new_slug, 'Welcome to ' || trim(_name) || ' verification portal')
  RETURNING id INTO new_institution_id;

  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role, institution_id, is_active)
  VALUES (auth.uid(), 'admin'::app_role, new_institution_id, true);

  UPDATE public.profiles
  SET institution_id = new_institution_id
  WHERE user_id = auth.uid();

  RETURN new_institution_id;
END;
$$;

-- Update join_institution_for_current_user to support multi-membership
CREATE OR REPLACE FUNCTION public.join_institution_for_current_user(_institution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _institution_id IS NULL THEN
    RAISE EXCEPTION 'Institution id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = _institution_id) THEN
    RAISE EXCEPTION 'Institution not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND institution_id = _institution_id
  ) THEN
    PERFORM public.switch_active_institution(_institution_id);
    RETURN;
  END IF;

  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role, institution_id, is_active)
  VALUES (auth.uid(), 'user'::app_role, _institution_id, true);

  UPDATE public.profiles
  SET institution_id = _institution_id
  WHERE user_id = auth.uid();
END;
$$;