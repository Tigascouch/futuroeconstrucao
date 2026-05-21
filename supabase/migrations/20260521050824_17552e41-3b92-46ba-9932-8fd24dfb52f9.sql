-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_manage"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Coluna hidden em chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN hidden_at TIMESTAMPTZ,
  ADD COLUMN hidden_by UUID;

-- 5. Atualizar policies de chat_messages para considerar moderação
DROP POLICY IF EXISTS chat_select_authenticated ON public.chat_messages;
DROP POLICY IF EXISTS chat_delete_own ON public.chat_messages;

CREATE POLICY "chat_select_visible"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    hidden = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "chat_delete_own_or_mod"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "chat_update_moderation"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

-- 6. Tabela de denúncias
CREATE TABLE public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 60),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  UNIQUE (message_id, reporter_id)
);

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own"
  ON public.chat_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own_or_mod"
  ON public.chat_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "reports_update_mod"
  ON public.chat_reports FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_chat_reports_status ON public.chat_reports(status, created_at DESC);
CREATE INDEX idx_chat_messages_hidden ON public.chat_messages(hidden, created_at DESC);

-- 7. Realtime para denúncias
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
ALTER TABLE public.chat_reports REPLICA IDENTITY FULL;