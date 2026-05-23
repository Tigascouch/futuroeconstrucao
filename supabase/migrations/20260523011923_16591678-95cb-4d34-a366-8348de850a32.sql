
-- 1. Restrict profile visibility for staff (teachers) to conversation participants only
DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;

CREATE POLICY profiles_select_conversation_participant ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversations c
    WHERE (c.staff_id = auth.uid() AND c.student_id = profiles.id)
       OR (c.student_id = auth.uid() AND c.staff_id = profiles.id)
  )
);

-- 2. Remove broad teacher-ID enumeration; expose only via scoped function
DROP POLICY IF EXISTS user_roles_select_teachers ON public.user_roles;

CREATE OR REPLACE FUNCTION public.get_chat_teacher_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.user_id = ur.user_id AND m.hidden = false
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_chat_teacher_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_teacher_ids() TO authenticated;

-- 3. Pin search_path on email queue helpers and revoke public execute
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
