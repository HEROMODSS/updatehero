import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { isAdminEmail } from "@/lib/admin.functions";
import { AppMenu } from "@/components/app-menu";

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
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const isAdmin = isAdminEmail(email);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span
              className="inline-flex size-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary"
              style={{ boxShadow: "0 0 18px rgba(0,229,190,0.25)" }}
            >
              <Sparkles className="size-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-gradient-cyan font-display">
              UpdateHero
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-sm">
            <AppMenu email={email} isAdmin={isAdmin} onSignOut={() => void logout()} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
