import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { NotebookPen, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: NotesPage,
});

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  // Load active note into editor when selection changes
  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setContent(active.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first note when list loads
  useEffect(() => {
    if (!activeId && notes.length > 0) setActiveId(notes[0].id);
  }, [notes, activeId]);

  // Debounced autosave
  useEffect(() => {
    if (!active) return;
    if (title === active.title && content === active.content) return;
    const t = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("notes")
        .update({ title, content })
        .eq("id", active.id);
      setSaving(false);
      if (error) toast.error("Não foi possível salvar.");
      else queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    }, 700);
    return () => clearTimeout(t);
  }, [title, content, active, queryClient, user?.id]);

  async function createNote() {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "Nova nota", content: "" })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Não foi possível criar a nota.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    setActiveId(data.id);
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível apagar.");
      return;
    }
    if (activeId === id) setActiveId(null);
    queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <NotebookPen size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Minhas notas</h1>
          <p className="text-sm text-muted-foreground">
            Bloco de notas pessoal — só você vê o que escreve aqui.
          </p>
        </div>
        <button
          onClick={createNote}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={16} /> Nova nota
        </button>
      </header>

      <div
        className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[280px_1fr]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Sidebar */}
        <aside className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar notas…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                {notes.length === 0 ? "Nenhuma nota. Clique em \"Nova nota\"." : "Nada encontrado."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((n) => {
                  const isActive = n.id === activeId;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => setActiveId(n.id)}
                        className={`group flex w-full items-start gap-2 px-4 py-3 text-left transition ${
                          isActive ? "bg-primary-soft" : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${isActive ? "text-primary" : ""}`}>
                            {n.title.trim() || "(sem título)"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {n.content.trim().split("\n")[0] || "Vazio"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(n.updated_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Apagar esta nota?")) deleteNote(n.id);
                          }}
                          role="button"
                          aria-label="Apagar"
                          className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Editor */}
        <section className="flex min-h-0 flex-col">
          {active ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da nota"
                  className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
                />
                <span className="text-[11px] text-muted-foreground">
                  {saving ? "Salvando…" : "Salvo"}
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Comece a escrever…"
                className="flex-1 resize-none bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground sm:p-6"
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
              <NotebookPen size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selecione uma nota ou crie uma nova para começar.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
