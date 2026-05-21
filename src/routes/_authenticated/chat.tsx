import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Send, MessagesSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Message = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Message[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user) return;
    if (content.length > 2000) {
      toast.error("Mensagem muito longa (máx. 2000 caracteres).");
      return;
    }
    setSending(true);
    const author_name = profile?.full_name?.trim() || user.email?.split("@")[0] || "Aluno";
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      author_name,
      content,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar a mensagem.");
      return;
    }
    setText("");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast.error("Não foi possível apagar.");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MessagesSquare size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Chat dos alunos</h1>
          <p className="text-sm text-muted-foreground">Converse e tire dúvidas com outros estudantes.</p>
        </div>
      </header>

      <div className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando mensagens…</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessagesSquare size={32} className="text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma mensagem ainda. Seja o primeiro!</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`group max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {!mine && (
                      <p className="mb-0.5 text-[11px] font-semibold opacity-70">{m.author_name}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <div className={`mt-1 flex items-center gap-2 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && (
                        <button onClick={() => handleDelete(m.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Apagar">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-card/60 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Escreva sua mensagem…"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
