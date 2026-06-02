import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Settings, Sparkles } from "lucide-react";
import { isAdminEmail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
});

function AuthLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const isAdmin = isAdminEmail(email);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            UpdateHero
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/settings">
              <Button variant="ghost" size="sm" className="rounded-xl" title="Default settings">
                <Settings className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="rounded-xl" title="Admin panel">
                  <ShieldCheck className="size-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            <span className="hidden md:block text-muted-foreground">{email}</span>
            <Button variant="outline" size="sm" onClick={logout} className="rounded-xl">
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
