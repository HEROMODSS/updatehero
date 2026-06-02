import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react";

const DEFAULT_POINTS = [
  "🔥 Faster performance and smoother UI",
  "🔒 Improved security and privacy handling",
];

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Defaults = {
  username: string;
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
  raw_json: string; // textarea content (JSON string or empty)
  enabled_key: string;
  use_custom: boolean;
};

const INIT: Defaults = {
  username: "",
  title: "🚀 New Update is Live!",
  points: DEFAULT_POINTS,
  update_link: "https://t.me/heromodss",
  cancel_text: "NOT NOW",
  update_text: "UPDATE NOW",
  raw_json: "",
  enabled_key: "enabled",
  use_custom: false,
};

function SettingsPage() {
  const [state, setState] = useState<Defaults>(INIT);
  const [pointsText, setPointsText] = useState(DEFAULT_POINTS.join("\n"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const ownerId = userRes.user?.id;
      if (!ownerId) return;
      const { data } = await supabase
        .from("user_defaults")
        .select("username,title,points,update_link,cancel_text,update_text,raw_json,enabled_key")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (data) {
        const points = Array.isArray(data.points) ? (data.points as string[]) : DEFAULT_POINTS;
        const raw = data.raw_json ? JSON.stringify(data.raw_json, null, 2) : "";
        setState({
          username: data.username ?? "",
          title: data.title,
          points,
          update_link: data.update_link,
          cancel_text: data.cancel_text,
          update_text: data.update_text,
          raw_json: raw,
          enabled_key: data.enabled_key || "enabled",
          use_custom: !!raw,
        });
        setPointsText(points.join("\n"));
      }
      setLoading(false);
    })();
  }, []);

  function patch<K extends keyof Defaults>(key: K, value: Defaults[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    const { data: userRes } = await supabase.auth.getUser();
    const ownerId = userRes.user?.id;
    if (!ownerId) return;

    const username = state.username.trim();
    if (!/^[A-Za-z0-9_-]{2,32}$/.test(username)) {
      toast.error("Username: 2–32 chars, letters/digits/_/- only, no spaces.");
      return;
    }

    let rawParsed: unknown = null;
    if (state.use_custom && state.raw_json.trim()) {
      try {
        rawParsed = JSON.parse(state.raw_json);
        if (typeof rawParsed !== "object" || rawParsed === null) throw new Error("not an object");
      } catch {
        toast.error("Custom JSON must be a valid JSON object.");
        return;
      }
    }

    const points = pointsText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    setSaving(true);
    const { error } = await supabase.from("user_defaults").upsert(
      {
        owner_id: ownerId,
        username,
        title: state.title || INIT.title,
        points: points.length ? points : DEFAULT_POINTS,
        update_link: state.update_link || INIT.update_link,
        cancel_text: state.cancel_text || INIT.cancel_text,
        update_text: state.update_text || INIT.update_text,
        raw_json: rawParsed,
        enabled_key: state.enabled_key.trim() || "enabled",
      },
      { onConflict: "owner_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("user_defaults_username_lower_idx")
          ? "That username is taken."
          : error.message,
      );
      return;
    }
    toast.success("Defaults saved.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in-50 duration-300">
      <Toaster />
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <Card className="overflow-hidden border-border bg-card">
        <div className="border-b border-border p-5">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            <SettingsIcon className="mr-1 size-3" /> Default settings
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your defaults</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your <span className="text-primary">username</span> is added in front of every app name
            you create, so your config links never clash with another user's.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <Field label="Username (no spaces, used as app prefix)">
                <Input
                  value={state.username}
                  onChange={(e) =>
                    patch("username", e.target.value.replace(/\s+/g, "").slice(0, 32))
                  }
                  placeholder="hero"
                  className="h-11 bg-hero-field"
                />
                <p className="text-xs text-muted-foreground">
                  Example link:{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    /{state.username || "username"}-AppName/v1
                  </code>
                </p>
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-hero-glass-strong p-3">
                <div>
                  <Label className="text-sm">Use custom JSON template</Label>
                  <p className="text-xs text-muted-foreground">
                    Different dex methods need different JSON keys. Enable to write your own.
                  </p>
                </div>
                <Switch
                  checked={state.use_custom}
                  onCheckedChange={(v) => patch("use_custom", v)}
                />
              </div>

              {state.use_custom ? (
                <>
                  <Field label="Enabled key (dot path, e.g. enabled or update.enabled)">
                    <Input
                      value={state.enabled_key}
                      onChange={(e) => patch("enabled_key", e.target.value.trim())}
                      placeholder="enabled"
                      className="h-11 bg-hero-field font-mono"
                    />
                  </Field>
                  <Field label="Custom JSON template">
                    <Textarea
                      rows={12}
                      value={state.raw_json}
                      onChange={(e) => patch("raw_json", e.target.value)}
                      className="bg-hero-field font-mono text-xs"
                      placeholder={`{\n  "enabled": true,\n  "title": "Update",\n  "url": "https://..."\n}`}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Dialog Title">
                    <Input
                      value={state.title}
                      onChange={(e) => patch("title", e.target.value)}
                      className="h-11 bg-hero-field"
                    />
                  </Field>
                  <Field label="Text in lines">
                    <Textarea
                      rows={4}
                      value={pointsText}
                      onChange={(e) => setPointsText(e.target.value)}
                      className="bg-hero-field"
                      placeholder={DEFAULT_POINTS.join("\n")}
                    />
                  </Field>
                  <Field label="Update Link">
                    <Input
                      value={state.update_link}
                      onChange={(e) => patch("update_link", e.target.value)}
                      className="h-11 bg-hero-field"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Cancel Button">
                      <Input
                        value={state.cancel_text}
                        onChange={(e) => patch("cancel_text", e.target.value)}
                        className="h-11 bg-hero-field"
                      />
                    </Field>
                    <Field label="Update Button">
                      <Input
                        value={state.update_text}
                        onChange={(e) => patch("update_text", e.target.value)}
                        className="h-11 bg-hero-field"
                      />
                    </Field>
                  </div>
                </>
              )}

              <Button onClick={save} disabled={saving} className="h-12 w-full rounded-xl">
                <Save className="size-4" />
                {saving ? "Saving…" : "Save defaults"}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
