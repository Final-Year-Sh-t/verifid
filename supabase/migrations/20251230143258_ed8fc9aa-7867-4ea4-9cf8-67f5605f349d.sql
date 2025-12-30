-- Drop the old constraint that prevents multi-institution membership
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;