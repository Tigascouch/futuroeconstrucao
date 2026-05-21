import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsModerator } from "@/lib/use-is-moderator";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, BookOpen, Video, CalendarCheck, User, LogOut, Menu, X, MessagesSquare, Shield, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

const baseNavItems = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/studies", label: "Estudos", icon: BookOpen },
  { to: "/chat", label: "Chat", icon: MessagesSquare },
  { to: "/direct", label: "Conversas", icon: MessageCircle },
  { to: "/meetings", label: "Aulas", icon: Video },
  { to: "/reminders", label: "Lembretes", icon: CalendarCheck },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

function AuthLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isModerator = useIsModerator();
  const navItems = isModerator
    ? [...baseNavItems, { to: "/moderation", label: "Moderação", icon: Shield } as const]
    : baseNavItems;

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card/40 backdrop-blur lg:flex lg:flex-col">
        <div className="p-6"><Logo /></div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary-soft text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`}>
                <item.icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground">
            <LogOut size={18} /> Sair
          </button>
          <p className="px-3 pt-2 text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size="sm" />
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-muted">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[57px] z-20 border-b border-border bg-background p-3 lg:hidden">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted">
              <item.icon size={18} /> {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted">
            <LogOut size={18} /> Sair
          </button>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
