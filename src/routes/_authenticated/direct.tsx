import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsModerator } from "@/lib/use-is-moderator";
import { MessageCircle, Plus, Search, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/direct")({
  component: DirectListPage,
});

type Conv = {
  id: string;
  staff_id: string;
  student_id: string;
  last_message_at: string;
};

type ProfileLite = { id: string; full_name: string; email: string };

function useIsTeacher() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is_teacher", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["teacher", "moderator", "admin"]);
      return (data?.length ?? 0) > 0;
    },
  });
  return !!data;
}

function DirectListPage() {
  const { user } = useAuth();
  const isMod = useIsModerator();
  const isTeacher = useIsTeacher();
  const canCreate = isMod || isTeacher;
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["direct_conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conv[];
    },
  });

  const otherIds = Array.from(
    new Set(convs.map((c) => (c.staff_id === user?.id ? c.student_id : c.staff_id)))
  );

  const { data: others = [] } = useQuery({
    queryKey: ["direct_others", otherIds.join(",")],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", otherIds);
      return (data ?? []) as ProfileLite[];
    },
  });
  const otherMap = new Map(others.map((p) => [p.id, p]));

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["search_students", search],
    enabled: canCreate && newOpen && search.trim().length >= 2,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.${term},email.ilike.${term}`)
        .neq("id", user!.id)
        .limit(15);
      return (data ?? []) as ProfileLite[];
    },
  });

  async function startChat(student: ProfileLite) {
    if (!user) return;
    setCreating(true);
    // Check if exists
    const { data: existing } = await supabase
      .from("direct_conversations")
      .select("id")
      .eq("staff_id", user.id)
      .eq("student_id", student.id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data, error } = await supabase
        .from("direct_conversations")
        .insert({ staff_id: user.id, student_id: student.id, created_by: user.id })
        .select("id")
        .single();
      if (error) {
        setCreating(false);
        toast.error("Não foi possível iniciar a conversa.");
        return;
      }
      convId = data.id;
    }
    setCreating(false);
    setNewOpen(false);
    setSearch("");
    queryClient.invalidateQueries({ queryKey: ["direct_conversations"] });
    window.location.assign(`/direct/${convId}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MessageCircle size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Conversas privadas</h1>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? "Inicie um chat 1 a 1 com um aluno."
              : "Suas conversas com professores e moderadores."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus size={16} /> Nova conversa
          </Button>
        )}
      </header>

      <div className="rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <MessageCircle size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda{canCreate ? " — comece uma com o botão acima." : "."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {convs.map((c) => {
              const otherId = c.staff_id === user?.id ? c.student_id : c.staff_id;
              const other = otherMap.get(otherId);
              const iAmStaff = c.staff_id === user?.id;
              return (
                <li key={c.id}>
                  <Link
                    to="/direct/$conversationId"
                    params={{ conversationId: c.id }}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/60"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-semibold">
                      {(other?.full_name ?? "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {other?.full_name ?? "Usuário"}
                        {!iAmStaff && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                            <GraduationCap size={9} /> Professor
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{other?.email ?? ""}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar conversa com aluno</DialogTitle>
            <DialogDescription>
              Busque pelo nome ou e-mail. A conversa será privada entre vocês dois.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou e-mail do aluno…"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {search.trim().length < 2 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Digite ao menos 2 caracteres.</p>
            ) : searching ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Buscando…</p>
            ) : searchResults.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhum aluno encontrado.</p>
            ) : (
              <ul className="space-y-1">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      disabled={creating}
                      onClick={() => startChat(p)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-muted disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary text-sm font-semibold">
                        {p.full_name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.full_name || "(sem nome)"}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
