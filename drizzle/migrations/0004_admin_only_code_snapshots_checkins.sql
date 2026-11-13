DROP POLICY IF EXISTS "Authenticated can read code revenue snapshots" ON public.code_revenue_snapshots;
CREATE POLICY "Admins can read code revenue snapshots" ON public.code_revenue_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated can read code checkins" ON public.code_checkins;
CREATE POLICY "Admins can read code checkins" ON public.code_checkins FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));