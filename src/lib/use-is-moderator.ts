import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useIsModerator() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is_moderator", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["moderator", "admin"]);
      return (data?.length ?? 0) > 0;
    },
  });
  return !!data;
}
