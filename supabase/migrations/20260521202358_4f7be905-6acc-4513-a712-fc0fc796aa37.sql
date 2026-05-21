
CREATE POLICY "user_roles_mod_manage_teacher_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'teacher'::public.app_role
  AND (public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "user_roles_mod_manage_teacher_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  role = 'teacher'::public.app_role
  AND (public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "user_roles_select_teachers"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'teacher'::public.app_role);

CREATE POLICY "profiles_select_mod"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
