import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, MessagesSquare, MessageCircle, Video,
  CalendarCheck, User, Shield, LogIn, UserPlus, KeyRound, LogOut,
  Bell, Trash2, Send, Search, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Comandos & Ajuda — Aprender Mais" },
      { name: "description", content: "Lista de comandos e ações disponíveis no app." },
    ],
  }),
  component: HelpPage,
});

type Cmd = { icon: any; label: string; desc: string; to?: string };
type Section = { title: string; desc?: string; items: Cmd[] };

const sections: Section[] = [
  {
    title: "Navegação principal",
    items: [
      { icon: LayoutDashboard, label: "Início", desc: "Visão geral, saudação e próximas atividades.", to: "/dashboard" },
      { icon: BookOpen, label: "Estudos", desc: "Conteúdos escolares e dúvidas.", to: "/studies" },
      { icon: MessagesSquare, label: "Chat", desc: "Chat geral da plataforma.", to: "/chat" },
      { icon: MessageCircle, label: "Conversas", desc: "Mensagens privadas 1-a-1.", to: "/direct" },
      { icon: Video, label: "Aulas", desc: "Agendar e ver videochamadas.", to: "/meetings" },
      { icon: CalendarCheck, label: "Lembretes", desc: "Organize sua rotina de estudos.", to: "/reminders" },
      { icon: User, label: "Perfil", desc: "Seus dados, série e etapa escolar.", to: "/profile" },
      { icon: Shield, label: "Moderação", desc: "Painel para moderadores e admins.", to: "/moderation" },
    ],
  },
  {
    title: "Autenticação",
    items: [
      { icon: UserPlus, label: "Cadastrar-se", desc: "Crie uma conta nova." },
      { icon: LogIn, label: "Entrar", desc: "Login por e-mail/senha ou Google." },
      { icon: KeyRound, label: "Esqueci minha senha", desc: "Recupere o acesso por e-mail." },
      { icon: ShieldCheck, label: "Verificação em 2 etapas", desc: "Código de 6 dígitos no 1º login de cada dispositivo." },
      { icon: LogOut, label: "Sair", desc: "Botão na barra lateral / menu mobile." },
    ],
  },
  {
    title: "Conversas privadas",
    desc: "Disponível para professores e moderadores.",
    items: [
      { icon: MessageCircle, label: "Nova conversa", desc: "Inicie um chat exclusivo com um aluno." },
      { icon: Search, label: "Buscar aluno", desc: "Por nome ou e-mail ao criar a conversa." },
      { icon: Send, label: "Enviar mensagem", desc: "Até 2000 caracteres, em tempo real." },
      { icon: Trash2, label: "Excluir mensagem", desc: "Remova uma mensagem enviada." },
    ],
  },
  {
    title: "Lembretes",
    items: [
      { icon: Bell, label: "Criar lembrete", desc: "Título, matéria e data/hora." },
      { icon: CalendarCheck, label: "Marcar como concluído", desc: "Acompanhe o que já estudou." },
      { icon: Trash2, label: "Excluir lembrete", desc: "Remova lembretes antigos." },
    ],
  },
  {
    title: "Aulas",
    items: [
      { icon: Video, label: "Agendar aula", desc: "Marque uma sessão com um professor." },
      { icon: CalendarCheck, label: "Próximas videochamadas", desc: "Veja sua agenda no painel inicial." },
    ],
  },
];

function HelpPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Comandos & Ajuda</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tudo o que você pode fazer no app, em um só lugar.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
            {section.desc && <p className="text-xs text-muted-foreground mt-0.5">{section.desc}</p>}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => {
              const content = (
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 transition hover:bg-muted">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
              return (
                <li key={item.label}>
                  {item.to ? <Link to={item.to}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
