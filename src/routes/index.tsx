import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "dexconfig — Remote UpdateDialog control" },
      {
        name: "description",
        content:
          "Manage your Android UpdateDialog JSON configs from one dashboard. No GitHub repo required.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <div className="font-semibold tracking-tight">
          <span className="text-primary">●</span> dexconfig
        </div>
        <Link to="/login">
          <Button variant="outline" size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" /> No more raw GitHub files
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">
          Control your <span className="text-primary">UpdateDialog</span> remotely.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground">
          Skip creating a repo and editing raw files. Manage every app's update
          config from one dashboard — toggle <code className="text-foreground">enabled</code>,
          edit text, points and links instantly.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login">
            <Button size="lg">Get started</Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline">How it works</Button>
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 pb-24 grid md:grid-cols-3 gap-4">
        <Step n="1" title="Create a config">
          Pick a slug (e.g. <code className="text-primary">5.6.80.171</code>) and
          fill the form: title, points, links, button labels.
        </Step>
        <Step n="2" title="Hardcode the URL once">
          Use{" "}
          <code className="text-primary text-xs">
            /api/public/config/&lt;slug&gt;
          </code>{" "}
          inside your dex instead of a GitHub raw URL.
        </Step>
        <Step n="3" title="Toggle anytime">
          Flip <code className="text-foreground">enabled</code> on/off, edit text,
          and changes go live instantly. No more re-uploading files.
        </Step>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">JSON your dex will receive:</p>
          <pre className="mt-3 text-xs sm:text-sm bg-muted/50 border border-border rounded-md p-4 overflow-auto">
{`{
  "credit": "MR. NoOB",
  "enabled": true,
  "title": "🔔 Update Available!",
  "points": [
    "🔥 Faster performance and smoother UI",
    "🛠️ Bug fixes & stability improvements"
  ],
  "update_link": "https://t.me/heromodss",
  "cancel_text": "NOT NOW",
  "update_text": "UPDATE NOW"
}`}
          </pre>
        </Card>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built on Lovable Cloud.
      </footer>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="text-primary font-mono text-sm">{n.padStart(2, "0")}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </Card>
  );
}
