import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, BookOpen, Smartphone, Zap, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "dexconfig — Remote UpdateDialog control" },
      {
        name: "description",
        content:
          "Auto-fetch every app version. Toggle updates per version with one URL.",
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <div className="font-semibold tracking-tight flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Zap className="size-3.5" />
          </span>
          dexconfig
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          One URL. Every version. Toggle anything.
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">
          Control update dialogs <span className="text-primary">remotely</span>.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground">
          Add your app once. New versions show up automatically the moment the dex
          calls home — flip updates on or off per version, instantly.
        </p>
      </section>

      {view === "home" ? (
        <section className="mx-auto max-w-3xl px-6 pb-24 grid sm:grid-cols-2 gap-4">
          <Card
            onClick={() => navigate({ to: "/login" })}
            className="p-6 cursor-pointer hover:border-primary transition group"
          >
            <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
              <LogIn className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">Sign in</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Open your dashboard. Add apps, toggle updates, edit text live.
            </p>
            <span className="mt-4 inline-block text-sm text-primary">
              Continue →
            </span>
          </Card>
          <Card
            onClick={() => setView("instructions")}
            className="p-6 cursor-pointer hover:border-primary transition group"
          >
            <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
              <BookOpen className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">Instructions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              How to wire up your dex once and forget about it.
            </p>
            <span className="mt-4 inline-block text-sm text-primary">
              Read →
            </span>
          </Card>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-6 pb-24 space-y-4">
          <button
            onClick={() => setView("home")}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back
          </button>
          <Card className="p-6 space-y-5">
            <Step n="1" icon={<Smartphone className="size-4" />} title="Add the dex once">
              Drop the merged <code className="text-primary">UpdateDialog</code> dex
              into the APK. It auto-detects package name and version.
            </Step>
            <Step n="2" icon={<LogIn className="size-4" />} title="Add the app">
              In the dashboard, enter the package name (e.g.{" "}
              <code className="text-primary">com.vanced.android.youtube</code>) and
              create a <code className="text-primary">default</code> version with
              your update message.
            </Step>
            <Step n="3" icon={<Zap className="size-4" />} title="New versions auto-appear">
              When users open a new version, the dex hits the API and the version
              shows up on your dashboard automatically — inheriting from{" "}
              <code className="text-primary">default</code>.
            </Step>
            <Step n="4" icon={<ToggleRight className="size-4" />} title="Toggle per version">
              Flip any version on or off in one click. The dialog title and points
              are editable inline.
            </Step>
          </Card>
          <Link to="/login">
            <Button size="lg" className="w-full">Get started</Button>
          </Link>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built on Lovable Cloud.
      </footer>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-mono text-sm">
        {n}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold flex items-center gap-2">
          {icon} {title}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
