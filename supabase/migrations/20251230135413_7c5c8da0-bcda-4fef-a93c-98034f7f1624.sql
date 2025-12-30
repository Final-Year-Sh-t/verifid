-- Create institution for current authenticated user and assign them as admin
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

  -- Upsert-ish into user_roles (table may or may not already have a row)
  UPDATE public.user_roles
  SET institution_id = new_institution_id,
      role = 'admin'::app_role
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (auth.uid(), 'admin'::app_role, new_institution_id);
  END IF;

  -- Link profile to institution if profile exists
  UPDATE public.profiles
  SET institution_id = new_institution_id
  WHERE user_id = auth.uid();

  RETURN new_institution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_institution_for_current_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_institution_for_current_user(text) TO authenticated;


-- Join an institution for current authenticated user (does not escalate role)
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

  -- Ensure institution exists
  PERFORM 1 FROM public.institutions WHERE id = _institution_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Institution not found';
  END IF;

  UPDATE public.user_roles
  SET institution_id = _institution_id
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (auth.uid(), 'user'::app_role, _institution_id);
  END IF;

  UPDATE public.profiles
  SET institution_id = _institution_id
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.join_institution_for_current_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_institution_for_current_user(uuid) TO authenticated;
