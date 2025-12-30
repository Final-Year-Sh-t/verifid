-- Allow authenticated users to create institutions
CREATE POLICY "Authenticated users can create institutions"
ON public.institutions
FOR INSERT
TO authenticated
WITH CHECK (true);