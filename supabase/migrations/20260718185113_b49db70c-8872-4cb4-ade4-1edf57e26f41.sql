
-- Role enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-assign 'staff' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- customers
CREATE TABLE public.customers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  pan text,
  address text,
  old_account_number text NOT NULL,
  new_account_number text,
  status text NOT NULL DEFAULT 'EMI',
  app_name text,
  pending_amount text,
  emi_amount text,
  tenure text,
  next_emi_date text,
  moratium_start_date text,
  moratium_end_date text,
  serial_number text,
  otp_verified int NOT NULL DEFAULT 0,
  verified_otp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.customers_id_seq TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- otp_records
CREATE TABLE public.otp_records (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  otp text NOT NULL,
  agreement_type text NOT NULL,
  email text NOT NULL,
  verified int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_records TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.otp_records_id_seq TO authenticated;
GRANT ALL ON public.otp_records TO service_role;
ALTER TABLE public.otp_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage otp" ON public.otp_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- email_logs
CREATE TABLE public.email_logs (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject text,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.email_logs_id_seq TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read/write logs" ON public.email_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- serial_counters
CREATE TABLE public.serial_counters (
  id bigserial PRIMARY KEY,
  counter_type text NOT NULL UNIQUE,
  current_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serial_counters TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.serial_counters_id_seq TO authenticated;
GRANT ALL ON public.serial_counters TO service_role;
ALTER TABLE public.serial_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage counters" ON public.serial_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER serial_counters_updated_at BEFORE UPDATE ON public.serial_counters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.serial_counters (counter_type, current_value) VALUES
  ('NDC', '28000000000000000000000013'),
  ('RESTRUCTURING', '25000000000000000000000146'),
  ('MORATORIUM', '26000000000000000000000021');
