import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/signup")({ component: Signup });

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  school_stage: z.enum(["fundamental", "medio", "professor"]),
  grade: z.string().trim().min(1, "Informe a série").max(50),
  school: z.string().trim().min(2, "Informe a escola").max(150),
});

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", school_stage: "fundamental" as "fundamental" | "medio" | "professor", grade: "", school: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          school_stage: parsed.data.school_stage,
          grade: parsed.data.grade,
          school: parsed.data.school,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message.includes("registered") ? "Este e-mail já está cadastrado" : error.message);
    toast.success("Conta criada! Bem-vindo(a) ao Aprender+.");
    navigate({ to: "/dashboard" });
  }

  const gradeOptions = form.school_stage === "fundamental"
    ? ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"]
    : form.school_stage === "medio"
    ? ["1º ano", "2º ano", "3º ano"]
    : ["Professor(a)"];

  return (
    <AuthShell title="Criar sua conta" subtitle="Comece sua jornada de aprendizado hoje.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome completo">
          <input value={form.full_name} onChange={set("full_name")} className="auth-input" placeholder="Maria da Silva" required />
        </Field>
        <Field label="E-mail">
          <input type="email" value={form.email} onChange={set("email")} className="auth-input" placeholder="voce@email.com" required />
        </Field>
        <Field label="Senha">
          <input type="password" value={form.password} onChange={set("password")} className="auth-input" placeholder="Mínimo 6 caracteres" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etapa">
            <select value={form.school_stage} onChange={set("school_stage")} className="auth-input">
              <option value="fundamental">Ensino Fundamental</option>
              <option value="medio">Ensino Médio</option>
            </select>
          </Field>
          <Field label="Série">
            <select value={form.grade} onChange={set("grade")} className="auth-input" required>
              <option value="">Selecione...</option>
              {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Escola">
          <input value={form.school} onChange={set("school")} className="auth-input" placeholder="Nome da sua escola" required />
        </Field>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
          {loading && <Loader2 size={16} className="animate-spin" />} Criar conta
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
