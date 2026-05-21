import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsModerator } from "@/lib/use-is-moderator";
import { Shield, EyeOff, Check, X, AlertTriangle, Trash2, GraduationCap, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/moderation")({ component: ModerationPage });

type Teacher = { user_id: string; profile?: { full_name: string; email: string } | null };

type Report = {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

type Message = {
  id: string;
  author_name: string;
  content: string;
  hidden: boolean;
  created_at: string;
  user_id: string;
};

function ModerationPage() {
  const { user } = useAuth();
  const isModerator = useIsModerator();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["chat_reports"],
    enabled: isModerator,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Report[];
    },
  });

  const messageIds = reports.map((r) => r.message_id);
  const { data: messagesMap = {} } = useQuery({
    queryKey: ["chat_reports_messages", messageIds.join(",")],
    enabled: isModerator && messageIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .in("id", messageIds);
      const map: Record<string, Message> = {};
      (data ?? []).forEach((m) => {
        map[m.id] = m as Message;
      });
      return map;
    },
  });

  useEffect(() => {
    if (!isModerator) return;
    const channel = supabase
      .channel("chat_reports_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reports" },
        () => queryClient.invalidateQueries({ queryKey: ["chat_reports"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isModerator, queryClient]);

  async function hideMessage(messageId: string) {
    const { error } = await supabase
      .from("chat_messages")
      .update({ hidden: true, hidden_at: new Date().toISOString(), hidden_by: user?.id })
      .eq("id", messageId);
    if (error) toast.error("Erro ao ocultar.");
    else {
      toast.success("Mensagem ocultada.");
      queryClient.invalidateQueries({ queryKey: ["chat_reports_messages"] });
    }
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) toast.error("Erro ao apagar.");
    else {
      toast.success("Mensagem apagada.");
      queryClient.invalidateQueries({ queryKey: ["chat_reports_messages"] });
    }
  }

  async function setStatus(id: string, status: "reviewed" | "dismissed") {
    const { error } = await supabase
      .from("chat_reports")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq("id", id);
    if (error) toast.error("Erro ao atualizar.");
    else toast.success(status === "reviewed" ? "Marcada como resolvida." : "Denúncia descartada.");
  }

  if (!isModerator) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Shield size={32} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é apenas para moderadores do chat.
        </p>
      </div>
    );
  }

  const pending = reports.filter((r) => r.status === "pending");
  const handled = reports.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Moderação do chat</h1>
          <p className="text-sm text-muted-foreground">
            Revise denúncias e mantenha a comunidade segura.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pendentes" value={pending.length} tone="warn" />
        <StatCard label="Resolvidas" value={reports.filter((r) => r.status === "reviewed").length} />
        <StatCard label="Descartadas" value={reports.filter((r) => r.status === "dismissed").length} />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Denúncias pendentes</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma denúncia pendente. 🎉
          </p>
        ) : (
          pending.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              message={messagesMap[r.message_id]}
              onHide={hideMessage}
              onDelete={deleteMessage}
              onSetStatus={setStatus}
            />
          ))
        )}
      </section>

      {handled.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Histórico</h2>
          {handled.slice(0, 30).map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              message={messagesMap[r.message_id]}
              onHide={hideMessage}
              onDelete={deleteMessage}
              onSetStatus={setStatus}
              compact
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "warn"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReportCard({
  report,
  message,
  onHide,
  onDelete,
  onSetStatus,
  compact,
}: {
  report: Report;
  message?: Message;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
  onSetStatus: (id: string, s: "reviewed" | "dismissed") => void;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          <AlertTriangle size={12} /> {report.reason}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(report.created_at).toLocaleString("pt-BR")}
        </span>
        {report.status !== "pending" && (
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {report.status === "reviewed" ? "✓ Resolvida" : "✕ Descartada"}
          </span>
        )}
      </div>

      {report.details && (
        <p className="mt-2 text-sm text-foreground/80">"{report.details}"</p>
      )}

      <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
        {message ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground">
              {message.author_name} {message.hidden && "· (oculta)"}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>
          </>
        ) : (
          <p className="text-xs italic text-muted-foreground">Mensagem indisponível ou apagada.</p>
        )}
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message && !message.hidden && (
            <Button size="sm" variant="outline" onClick={() => onHide(message.id)}>
              <EyeOff size={14} /> Ocultar
            </Button>
          )}
          {message && (
            <Button size="sm" variant="destructive" onClick={() => onDelete(message.id)}>
              <Trash2 size={14} /> Apagar
            </Button>
          )}
          <Button size="sm" variant="default" onClick={() => onSetStatus(report.id, "reviewed")}>
            <Check size={14} /> Resolvida
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSetStatus(report.id, "dismissed")}>
            <X size={14} /> Descartar
          </Button>
        </div>
      )}
    </div>
  );
}
