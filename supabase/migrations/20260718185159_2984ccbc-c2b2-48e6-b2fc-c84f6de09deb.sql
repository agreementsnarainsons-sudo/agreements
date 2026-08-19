
DROP POLICY IF EXISTS "Authenticated manage customers" ON public.customers;
CREATE POLICY "Staff view customers" ON public.customers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update customers" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff delete customers" ON public.customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated manage otp" ON public.otp_records;
CREATE POLICY "Staff view otp" ON public.otp_records FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff insert otp" ON public.otp_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update otp" ON public.otp_records FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff delete otp" ON public.otp_records FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read/write logs" ON public.email_logs;
CREATE POLICY "Staff view logs" ON public.email_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff insert logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated manage counters" ON public.serial_counters;
CREATE POLICY "Staff view counters" ON public.serial_counters FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update counters" ON public.serial_counters FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
