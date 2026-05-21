import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2, User as UserIcon } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  school_stage: z.enum(["fundamental", "medio"]),
  grade: z.string().trim().min(1).max(50),
  school: z.string().trim().min(2).max(150),
});

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", school_stage: "fundamental" as "fundamental" | "medio", grade: "", school: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name, school_stage: profile.school_stage as any, grade: profile.grade, school: profile.school });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  const gradeOptions = form.school_stage === "fundamental"
    ? ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"]
    : ["1º ano", "2º ano", "3º ano"];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mantenha seus dados sempre atualizados.</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <UserIcon size={26} />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{profile?.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <Field label="Nome completo">
          <input className="profile-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etapa">
            <select className="profile-input" value={form.school_stage} onChange={(e) => setForm({ ...form, school_stage: e.target.value as any, grade: "" })}>
              <option value="fundamental">Ensino Fundamental</option>
              <option value="medio">Ensino Médio</option>
            </select>
          </Field>
          <Field label="Série">
            <select className="profile-input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option value="">Selecione...</option>
              {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Escola">
          <input className="profile-input" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        </Field>
        <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving && <Loader2 size={16} className="animate-spin" />} Salvar alterações
        </button>
      </form>

      <style>{`.profile-input { width:100%; border-radius:0.75rem; border:1px solid var(--border); background: var(--background); padding:0.7rem 0.9rem; font-size:0.875rem; outline:none; } .profile-input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 18%, transparent); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
