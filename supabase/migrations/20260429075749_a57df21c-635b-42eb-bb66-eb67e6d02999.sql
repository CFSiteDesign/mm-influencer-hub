
-- Lock down the SECURITY DEFINER trigger function so only the table trigger
-- (which runs as the table owner) can invoke it. Anon/authenticated users
-- cannot call it directly.
REVOKE ALL ON FUNCTION public.handle_applicant_approved() FROM PUBLIC, anon, authenticated;

-- search_path is already set inside the function definition; reaffirm it
ALTER FUNCTION public.handle_applicant_approved() SET search_path = public;
