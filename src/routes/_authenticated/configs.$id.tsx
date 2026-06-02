import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { ArrowLeft, Copy, Save } from "lucide-react";

const DEFAULT_POINTS = [
  "🔥 Faster performance and smoother UI",
  "🔒 Improved security and privacy handling",
];
const PUBLIC_CONFIG_ORIGIN = "https://updatehero.lovable.app";

type Config = {
  id: string;
  app_name: string;
  version: string;
  enabled: boolean;
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
  raw_json: unknown;
  enabled_key: string;
};

export const Route = createFileRoute("/_authenticated/configs/$id")({
  component: EditConfig,
});

function EditConfig() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [pointsText, setPointsText] = useState("");
  const [rawJsonText, setRawJsonText] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const { data, error } = await supabase
      .from("app_configs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Not found");
      navigate({ to: "/dashboard" });
      return;
    }
    const points = Array.isArray(data.points) ? (data.points as string[]) : DEFAULT_POINTS;
    const hasRaw = data.raw_json && typeof data.raw_json === "object";
    setConfig({
      id: data.id,
      app_name: data.app_name,
      version: data.version,
      enabled: data.enabled,
      title: data.title || "🚀 New Update is Live!",
      points,
      update_link: data.update_link || "https://t.me/heromodss",
      cancel_text: data.cancel_text || "NOT NOW",
      update_text: data.update_text || "UPDATE NOW",
      raw_json: data.raw_json,
      enabled_key: data.enabled_key || "enabled",
    });
    setPointsText(points.join("\n"));
    setRawJsonText(hasRaw ? JSON.stringify(data.raw_json, null, 2) : "");
    setUseCustom(!!hasRaw);
  }

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  async function save() {
    if (!config) return;

    let rawParsed: unknown = null;
    if (useCustom) {
      if (!rawJsonText.trim()) {
        toast.error("Custom JSON is empty.");
        return;
      }
      try {
        rawParsed = JSON.parse(rawJsonText);
        if (typeof rawParsed !== "object" || rawParsed === null) throw new Error("not object");
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
    const { error } = await supabase
      .from("app_configs")
      .update({
        credit: "HERO",
        enabled: config.enabled,
        title: config.title || "🚀 New Update is Live!",
        points: points.length ? points : DEFAULT_POINTS,
        update_link: config.update_link || "https://t.me/heromodss",
        cancel_text: config.cancel_text || "NOT NOW",
        update_text: config.update_text || "UPDATE NOW",
        raw_json: rawParsed,
        enabled_key: (config.enabled_key || "enabled").trim() || "enabled",
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
  }

  async function copyLink() {
    if (!config) return;
    await navigator.clipboard.writeText(
      `${PUBLIC_CONFIG_ORIGIN}/api/public/config/${encodeURIComponent(config.app_name)}/${encodeURIComponent(
        config.version,
      )}`,
    );
    toast.success("Config link copied");
  }

  if (!config) {
    return (
      <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading…
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in-50 duration-300">
      <Toaster />
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl">
          <Copy className="size-4" /> Copy link
        </Button>
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <div className="border-b border-border p-5">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Version editor</Badge>
          <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">
            {config.app_name} / {config.version}
          </h1>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-hero-glass-strong p-3">
            <Label className="text-sm">Update Toggle (live)</Label>
            <Switch checked={config.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-hero-glass-strong p-3">
            <div>
              <Label className="text-sm">Use custom JSON for this version</Label>
              <p className="text-xs text-muted-foreground">
                Auto-adjusts the UI to just JSON + enabled key.
              </p>
            </div>
            <Switch checked={useCustom} onCheckedChange={setUseCustom} />
          </div>

          {useCustom ? (
            <>
              <Field label="Enabled key (dot path, e.g. enabled or update.enabled)">
                <Input
                  value={config.enabled_key}
                  onChange={(e) => set("enabled_key", e.target.value.trim())}
                  className="h-11 bg-hero-field font-mono"
                  placeholder="enabled"
                />
              </Field>
              <Field label="Custom JSON">
                <Textarea
                  rows={14}
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  className="bg-hero-field font-mono text-xs"
                  placeholder={`{\n  "enabled": true,\n  "title": "Update",\n  "url": "https://..."\n}`}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                The toggle above is auto-written into the JSON at the key path on every request.
              </p>
            </>
          ) : (
            <>
              <Field label="Title">
                <Input
                  value={config.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="h-11 bg-hero-field"
                />
              </Field>

              <Field label="Text in line">
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
                  value={config.update_link}
                  onChange={(e) => set("update_link", e.target.value)}
                  className="h-11 bg-hero-field"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cancel Button">
                  <Input
                    value={config.cancel_text}
                    onChange={(e) => set("cancel_text", e.target.value)}
                    className="h-11 bg-hero-field"
                  />
                </Field>
                <Field label="Update Button">
                  <Input
                    value={config.update_text}
                    onChange={(e) => set("update_text", e.target.value)}
                    className="h-11 bg-hero-field"
                  />
                </Field>
              </div>
            </>
          )}

          <Button onClick={save} disabled={saving} className="h-12 w-full rounded-xl">
            <Save className="size-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
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
