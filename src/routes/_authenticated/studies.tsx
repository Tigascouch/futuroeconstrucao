import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/studies")({ component: Stub });

function Stub() {
  return (
    <ComingSoon title="Conteúdos escolares" desc="Em breve: matérias por disciplina, dúvidas e materiais complementares." />
  );
}

export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Construction size={26} />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
        <ArrowLeft size={14} /> Voltar ao início
      </Link>
    </div>
  );
}
