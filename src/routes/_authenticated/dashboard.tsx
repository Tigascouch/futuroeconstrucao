import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CalendarCheck, Video, Sparkles, BookOpen, ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders-upcoming", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_reminders")
        .select("*")
        .eq("completed", false)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "estudante";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl p-8 text-primary-foreground" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-soft)" }}>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles size={12} /> {profile?.school_stage === "medio" ? "Ensino Médio" : "Ensino Fundamental"} · {profile?.grade}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            {greeting()}, {firstName}!
          </h1>
          <p className="mt-2 text-sm opacity-90 sm:text-base">
            Que bom ter você aqui. Vamos continuar aprendendo hoje?
          </p>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard to="/studies" icon={BookOpen} title="Conteúdos escolares" desc="Acesse matérias e tire dúvidas." />
        <ActionCard to="/meetings" icon={Video} title="Agendar aula" desc="Marque uma sessão com professor." />
        <ActionCard to="/reminders" icon={CalendarCheck} title="Meus lembretes" desc="Organize sua rotina de estudos." />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Próximas sessões de estudo" empty="Nenhuma sessão agendada." emptyAction={{ label: "Criar lembrete", to: "/reminders" }} items={reminders.map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subject ?? undefined,
          date: new Date(r.scheduled_at),
          icon: CalendarCheck,
        }))} />
        <Panel title="Próximas videochamadas" empty="Nenhuma aula agendada." emptyAction={{ label: "Agendar aula", to: "/meetings" }} items={[]} />
      </section>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <ArrowRight size={16} className="absolute right-5 top-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function Panel({ title, items, empty, emptyAction }: {
  title: string;
  items: { id: string; title: string; subtitle?: string; date: Date; icon: any }[];
  empty: string;
  emptyAction?: { label: string; to: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          {emptyAction && (
            <Link to={emptyAction.to} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              {emptyAction.label} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <it.icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.title}</p>
                {it.subtitle && <p className="text-xs text-muted-foreground truncate">{it.subtitle}</p>}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} />
                {it.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
