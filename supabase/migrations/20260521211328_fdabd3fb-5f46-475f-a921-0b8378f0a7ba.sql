CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trusted_devices_select_own" ON public.trusted_devices
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "trusted_devices_insert_own" ON public.trusted_devices
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trusted_devices_update_own" ON public.trusted_devices
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trusted_devices_delete_own" ON public.trusted_devices
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id);