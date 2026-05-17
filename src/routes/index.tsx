import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Heart, LogIn, Plus, Sparkles, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "UpdateHero — Remote update control" },
      {
        name: "description",
        content: "Manual app and version update control with a private dashboard.",
      },
    ],
  }),
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<"home" | "instructions">("home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard" });
        return;
      }
      setChecking(false);
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-hero-sm">
            <Sparkles className="size-4" />
          </span>
          UpdateHero
        </div>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          Made with <Heart className="size-4 text-primary" /> by Hero
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-6 sm:pt-16">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-hero-glass p-6 text-center shadow-hero backdrop-blur-xl sm:p-10">
          <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            Manual method restored
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">UpdateHero</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Add App Name and Version Number manually, then toggle each saved version live or
            disabled from one private dashboard.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-hero-glass-strong px-4 py-2 text-sm text-primary shadow-hero-sm">
            Made with ❤️ by Hero
          </p>
        </section>

        {view === "home" ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card
              onClick={() => navigate({ to: "/login" })}
              className="group cursor-pointer border-primary/15 bg-hero-glass p-6 shadow-hero backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <LogIn className="size-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Sign-in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open the UpdateHero dashboard and manage your app update versions.
              </p>
              <span className="mt-5 inline-flex text-sm font-medium text-primary">Continue →</span>
            </Card>

            <Card
              onClick={() => setView("instructions")}
              className="group cursor-pointer border-primary/15 bg-hero-glass p-6 shadow-hero backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <BookOpen className="size-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Instructions</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                See the old working flow: create app folder, add versions, use the exact version
                link.
              </p>
              <span className="mt-5 inline-flex text-sm font-medium text-primary">Read →</span>
            </Card>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            <button
              onClick={() => setView("home")}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← Back
            </button>
            <Card className="space-y-5 border-primary/15 bg-hero-glass p-6 shadow-hero backdrop-blur-xl">
              <Step icon={<Plus className="size-4" />} title="Add app manually">
                Enter App Name and Version Number. The dashboard creates an Android app folder with
                that version inside.
              </Step>
              <Step icon={<ToggleRight className="size-4" />} title="Toggle each version">
                Every version has its own Update Toggle, Edit, Delete and Live status.
              </Step>
              <Step icon={<BookOpen className="size-4" />} title="Use the saved version link">
                The public link only works for versions you created in UpdateHero, matching the old
                reliable method.
              </Step>
            </Card>
            <Link to="/login">
              <Button size="lg" className="h-12 w-full rounded-xl shadow-hero-sm">
                Sign in to UpdateHero
              </Button>
            </Link>
          </section>
        )}
      </main>

      <footer className="border-t border-primary/10 py-8 text-center text-xs text-muted-foreground">
        Made with ❤️ by Hero
      </footer>
    </div>
  );
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-primary/10 bg-hero-glass-strong p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
