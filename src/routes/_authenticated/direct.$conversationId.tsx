import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/direct/$conversationId")({
  component: DirectChatPage,
});

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function DirectChatPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ["direct_conv", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const otherId = conv ? (conv.staff_id === user?.id ? conv.student_id : conv.staff_id) : null;

  const { data: other } = useQuery({
    queryKey: ["direct_other_profile", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", otherId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["direct_messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`direct_${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["direct_messages", conversationId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user) return;
    if (content.length > 2000) {
      toast.error("Mensagem muito longa.");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("direct_messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, content });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar.");
      return;
    }
    setText("");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("direct_messages").delete().eq("id", id);
    if (error) toast.error("Não foi possível apagar.");
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link
          to="/direct"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-semibold">
          {(other?.full_name ?? "?").trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold">{other?.full_name ?? "Conversa"}</h1>
          <p className="truncate text-xs text-muted-foreground">{other?.email ?? ""}</p>
        </div>
      </header>

      <div
        className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem. Diga olá!</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <div
                      className={`mt-1 flex items-center gap-2 text-[10px] ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {mine && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 transition group-hover:opacity-100"
                          aria-label="Apagar"
                        >
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
