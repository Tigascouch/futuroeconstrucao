import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

const schema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const DEVICE_KEY = "aprender_device_id";
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

type Step = "credentials" | "otp";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);

  async function trustDeviceAndGo() {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("trusted_devices").upsert(
        { user_id: user.id, device_id: deviceId, user_agent: navigator.userAgent, last_used_at: new Date().toISOString() },
        { onConflict: "user_id,device_id" },
      );
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      return toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
    }

    // Verifica dispositivo confiável
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: trusted } = await supabase
      .from("trusted_devices")
      .select("id")
      .eq("user_id", user!.id)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (trusted) {
      // Atualiza last_used e entra
      await supabase.from("trusted_devices").update({ last_used_at: new Date().toISOString() }).eq("id", trusted.id);
      setLoading(false);
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard" });
      return;
    }

    // Dispositivo novo → exige código por e-mail
    await supabase.auth.signOut();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (otpErr) return toast.error("Não foi possível enviar o código: " + otpErr.message);
    toast.success("Enviamos um código de verificação para o seu e-mail.");
    setStep("otp");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (code.length < 6) return toast.error("Digite o código de 6 dígitos");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setLoading(false);
      return toast.error("Código inválido ou expirado");
    }
    await trustDeviceAndGo();
    setLoading(false);
  }

  async function resendCode() {
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setResending(false);
    if (error) return toast.error("Não foi possível reenviar: " + error.message);
    toast.success("Novo código enviado.");
  }

  if (step === "otp") {
    return (
      <AuthShell title="Verifique seu e-mail" subtitle="Detectamos um novo dispositivo. Para sua segurança, confirme o código.">
        <form onSubmit={onVerify} className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Mail size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>Enviamos um código de 6 dígitos para <strong className="text-foreground">{email}</strong>. O código expira em alguns minutos.</span>
          </div>
          <Field label="Código de verificação">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="auth-input text-center font-mono text-lg tracking-[0.5em]"
              placeholder="000000"
              required
              autoFocus
            />
          </Field>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Confirmar e entrar
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setStep("credentials"); setOtp(""); }} className="text-muted-foreground hover:text-foreground">← Usar outro e-mail</button>
            <button type="button" disabled={resending} onClick={resendCode} className="font-medium text-primary hover:underline disabled:opacity-60">
              {resending ? "Reenviando..." : "Reenviar código"}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Entrar na sua conta" subtitle="Continue seus estudos de onde parou.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" placeholder="voce@email.com" required />
        </Field>
        <Field label="Senha">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="••••••••" required />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Esqueci minha senha</Link>
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
          {loading && <Loader2 size={16} className="animate-spin" />} Entrar
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} /> Protegido por verificação em duas etapas
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta? <Link to="/signup" className="font-semibold text-primary hover:underline">Cadastre-se</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-10 lg:flex" style={{ background: "var(--gradient-hero)" }}>
        <Logo />
        <div className="text-primary-foreground">
          <p className="font-display text-3xl font-semibold leading-tight">"A educação é a arma mais poderosa para mudar o mundo."</p>
          <p className="mt-3 text-sm opacity-80">— Nelson Mandela</p>
        </div>
        <p className="text-xs text-primary-foreground/70">ODS 4 · Educação de Qualidade</p>
      </div>
      <div className="relative flex items-center justify-center px-6 py-12">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur transition hover:bg-background hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <style>{`.auth-input { width:100%; border-radius:0.75rem; border:1px solid var(--border); background: var(--background); padding:0.7rem 0.9rem; font-size:0.875rem; transition: all .15s; outline:none; } .auth-input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 18%, transparent); }`}</style>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
