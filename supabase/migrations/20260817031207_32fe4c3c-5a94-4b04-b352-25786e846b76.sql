CREATE POLICY "Authenticated users can update creator_codes"
ON public.creator_codes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

GRANT UPDATE ON public.creator_codes TO authenticated;