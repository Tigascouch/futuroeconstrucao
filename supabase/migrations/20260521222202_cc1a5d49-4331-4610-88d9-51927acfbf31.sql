
-- Helper: is staff (teacher / moderator / admin)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('teacher','moderator','admin')
  );
$$;

CREATE TABLE public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_conversations_distinct CHECK (staff_id <> student_id),
  CONSTRAINT direct_conversations_unique UNIQUE (staff_id, student_id)
);

CREATE INDEX idx_direct_conv_staff ON public.direct_conversations(staff_id);
CREATE INDEX idx_direct_conv_student ON public.direct_conversations(student_id);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_conv_select_participant ON public.direct_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = staff_id OR auth.uid() = student_id);

CREATE POLICY direct_conv_insert_staff ON public.direct_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = staff_id
    AND auth.uid() = created_by
    AND public.is_staff(auth.uid())
    AND staff_id <> student_id
  );

CREATE POLICY direct_conv_delete_staff ON public.direct_conversations
  FOR DELETE TO authenticated
  USING (auth.uid() = staff_id);

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_msgs_conv ON public.direct_messages(conversation_id, created_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_msgs_select_participant ON public.direct_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_conversations c
    WHERE c.id = conversation_id
      AND (auth.uid() = c.staff_id OR auth.uid() = c.student_id)
  ));

CREATE POLICY direct_msgs_insert_participant ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.staff_id OR auth.uid() = c.student_id)
    )
  );

CREATE POLICY direct_msgs_delete_own ON public.direct_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Trigger: update last_message_at on new message
CREATE OR REPLACE FUNCTION public.touch_direct_conversation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.direct_conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER direct_messages_touch_conv
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_direct_conversation();

-- Allow staff (teachers/mods/admins) to look up student profiles to start a chat
CREATE POLICY profiles_select_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Realtime
ALTER TABLE public.direct_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
