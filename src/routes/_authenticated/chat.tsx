import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsModerator } from "@/lib/use-is-moderator";
import { Send, MessagesSquare, Trash2, Flag, EyeOff, ShieldCheck, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Message = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  hidden: boolean;
};

const REPORT_REASONS = [
  "Spam ou propaganda",
  "Linguagem ofensiva",
  "Bullying ou assédio",
  "Conteúdo inapropriado",
  "Informação falsa",
  "Outro",
];

function ChatPage() {
  const { user } = useAuth();
  const isModerator = useIsModerator();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
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

  const { data: teacherIds = new Set<string>() } = useQuery({
    queryKey: ["teacher_ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      return new Set((data ?? []).map((r) => r.user_id));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["chat_messages"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  async function handleHide(id: string) {
    const { error } = await supabase
      .from("chat_messages")
      .update({ hidden: true, hidden_at: new Date().toISOString(), hidden_by: user?.id })
      .eq("id", id);
    if (error) toast.error("Não foi possível ocultar.");
    else toast.success("Mensagem ocultada.");
  }

  function openReport(m: Message) {
    setReportTarget(m);
    setReportReason(REPORT_REASONS[0]);
    setReportDetails("");
  }

  async function submitReport() {
    if (!reportTarget || !user) return;
    setReportSubmitting(true);
    const { error } = await supabase.from("chat_reports").insert({
      message_id: reportTarget.id,
      reporter_id: user.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
    setReportSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("Você já denunciou esta mensagem.");
      else toast.error("Não foi possível enviar a denúncia.");
      return;
    }
    toast.success("Denúncia enviada. Obrigado por ajudar a manter o chat seguro!");
    setReportTarget(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MessagesSquare size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Chat dos alunos</h1>
          <p className="text-sm text-muted-foreground">Converse e tire dúvidas com respeito.</p>
        </div>
        {isModerator && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck size={14} /> Moderador
          </span>
        )}
      </header>

      <div
        className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
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
              const isTeacher = teacherIds.has(m.user_id);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    } ${isTeacher && !mine ? "ring-2 ring-amber-400/60" : ""} ${m.hidden ? "opacity-60 italic" : ""}`}
                  >
                    {(!mine || isTeacher) && (
                      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold opacity-80">
                        {!mine && <span>{m.author_name}</span>}
                        {isTeacher && (
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-400/20 text-amber-700 dark:text-amber-300"}`}>
                            <GraduationCap size={9} /> Professor
                          </span>
                        )}
                      </p>
                    )}
                    {m.hidden ? (
                      <p className="text-xs">[Mensagem ocultada pela moderação]</p>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
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
                      {!mine && !m.hidden && (
                        <button
                          onClick={() => openReport(m)}
                          className="opacity-0 transition hover:text-destructive group-hover:opacity-100"
                          aria-label="Denunciar"
                          title="Denunciar mensagem"
                        >
                          <Flag size={11} />
                        </button>
                      )}
                      {isModerator && !mine && !m.hidden && (
                        <button
                          onClick={() => handleHide(m.id)}
                          className="opacity-0 transition hover:text-foreground group-hover:opacity-100"
                          aria-label="Ocultar"
                          title="Ocultar (moderação)"
                        >
                          <EyeOff size={11} />
                        </button>
                      )}
                      {(mine || isModerator) && (
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

      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag size={18} className="text-destructive" /> Denunciar mensagem
            </DialogTitle>
            <DialogDescription>
              Sua denúncia será analisada pela moderação. Use somente em casos reais.
            </DialogDescription>
          </DialogHeader>

          {reportTarget && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground">{reportTarget.author_name}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words">{reportTarget.content}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/80">Motivo</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                Detalhes (opcional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Conte o que aconteceu…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {reportDetails.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={submitReport} disabled={reportSubmitting}>
              {reportSubmitting ? "Enviando…" : "Enviar denúncia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
