import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre nós — Futuro em Construção" },
      { name: "description", content: "Conheça nossa missão e entre em contato pelo e-mail ou telefone." },
      { property: "og:title", content: "Sobre nós — Futuro em Construção" },
      { property: "og:description", content: "Conheça nossa missão e fale com a nossa equipe." },
    ],
  }),
  component: AboutPage,
});

const contacts = [
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@futuroemconstrucao.com.br",
    href: "mailto:contato@futuroemconstrucao.com.br",
  },
  {
    icon: Phone,
    label: "Telefone",
    value: "(11) 99999-0000",
    href: "tel:+5511999990000",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "(11) 99999-0000",
    href: "https://wa.me/5511999990000",
  },
  {
    icon: MapPin,
    label: "Endereço",
    value: "São Paulo, SP — Brasil",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/"><Logo /></Link>
        <nav className="flex items-center gap-2">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">
            <ArrowLeft size={16} /> Início
          </Link>
          <Link to="/login" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Entrar
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-8 sm:pt-12">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Sobre nós
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Educação que conecta{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
              alunos e professores
            </span>
            .
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Somos uma plataforma criada para estudantes da rede pública, alinhada à ODS 4 — Educação de Qualidade.
            Nosso objetivo é oferecer um espaço seguro onde alunos possam estudar, tirar dúvidas e contar com o apoio
            de professores e colegas.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Nossa missão</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Democratizar o acesso a conteúdos de qualidade, ferramentas de estudo e apoio educacional, ajudando cada
            estudante a construir seu próprio futuro com autonomia, organização e confiança.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Entre em contato</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tem dúvidas, sugestões ou quer fazer parte do projeto? Fale com a gente.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {contacts.map((c) => {
              const content = (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <c.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </p>
                    <p className="mt-0.5 truncate font-medium text-foreground">{c.value}</p>
                  </div>
                </>
              );
              const className =
                "flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80";
              return c.href ? (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={className}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {content}
                </a>
              ) : (
                <div key={c.label} className={className} style={{ boxShadow: "var(--shadow-card)" }}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Construído com 💙 para a ODS 4 — Educação de Qualidade
      </footer>
    </div>
  );
}
