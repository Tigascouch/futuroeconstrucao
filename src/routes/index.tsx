import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowRight, BookOpen, MessagesSquare, Video, CalendarCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const features = [
  { icon: BookOpen, title: "Conteúdos por disciplina", desc: "Material organizado para Fundamental e Médio." },
  { icon: MessagesSquare, title: "Tire suas dúvidas", desc: "Registre dúvidas e acompanhe respostas por matéria." },
  { icon: Video, title: "Aulas no Google Meet", desc: "Agende sessões com professores em poucos cliques." },
  { icon: CalendarCheck, title: "Rotina de estudos", desc: "Lembretes diários e calendário simples." },
];

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/about" className="hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Sobre nós</Link>
          <Link to="/instalar" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm font-medium text-foreground/80 backdrop-blur hover:text-foreground">
            <QrCode size={16} /> <span className="hidden sm:inline">Baixar no celular</span>
          </Link>
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Entrar</Link>
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Criar conta <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              Futuro em Construção
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Aprender ficou{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                mais simples
              </span>
              .
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Uma plataforma feita para estudantes da rede pública. Tire dúvidas, agende aulas com professores e organize sua rotina — tudo em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90" style={{ boxShadow: "var(--shadow-soft)" }}>
                Começar agora <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="rounded-xl border border-border bg-background/60 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-background">
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative grid grid-cols-2 gap-3 rounded-3xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl bg-muted/60 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <f.icon size={20} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Construído com 💙 para a ODS 4 — Educação de Qualidade
      </footer>
    </div>
  );
}
