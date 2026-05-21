import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/reset-password")({ component: Reset });

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery hash; just wait for session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell title="Nova senha" subtitle="Defina sua nova senha de acesso.">
      {!ready ? (
        <div className="text-sm text-muted-foreground">Validando link...</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nova senha">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="Mínimo 6 caracteres" required />
          </Field>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {loading && <Loader2 size={16} className="animate-spin" />} Atualizar senha
          </button>
        </form>
      )}
    </AuthShell>
  );
}
