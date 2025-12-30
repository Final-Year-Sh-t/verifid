-- Allow institution admins to update roles for users in their institution (promote to admin)
CREATE POLICY "Institution admins can update roles in their institution"
ON public.user_roles
FOR UPDATE
USING (
  (institution_id = get_user_institution(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (institution_id = get_user_institution(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);