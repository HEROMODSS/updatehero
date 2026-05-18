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
  credit: string;
  enabled: boolean;
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
};

export const Route = createFileRoute("/_authenticated/configs/$id")({
  component: EditConfig,
});

function EditConfig() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [pointsText, setPointsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const { data, error } = await supabase.from("app_configs").select("*").eq("id", id).maybeSingle();
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
    setConfig({
      id: data.id,
      app_name: data.app_name,
      version: data.version,
      credit: data.credit || "HERO",
      enabled: data.enabled,
      title: data.title || "🚀 New Update is Live!",
      points,
      update_link: data.update_link || "https://t.me/heromodss",
      cancel_text: data.cancel_text || "NOT NOW",
      update_text: data.update_text || "UPDATE NOW",
    });
    setPointsText(points.join("\n"));
  }

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  async function save() {
    if (!config) return;
    const points = pointsText
      .split("\n")
      .map((point) => point.trim())
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
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setConfig({
      ...config,
      credit: "HERO",
      points: points.length ? points : DEFAULT_POINTS,
      cancel_text: config.cancel_text || "NOT NOW",
      update_text: config.update_text || "UPDATE NOW",
    });
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
      <Card className="border-primary/15 bg-hero-glass p-8 text-center text-sm text-muted-foreground shadow-hero backdrop-blur-xl">
        Loading settings…
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
      <Toaster />
      <div className="flex items-center justify-between gap-3">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl bg-hero-glass-strong">
          <Copy className="size-4" /> Copy link
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-hero-glass shadow-hero backdrop-blur-xl">
        <div className="border-b border-primary/10 p-5">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Version editor</Badge>
          <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">
            {config.app_name} / {config.version}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Credits are kept hidden for the dialog.</p>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/10 bg-hero-glass-strong p-3">
            <Label className="text-sm">Update Toggle</Label>
            <Switch checked={config.enabled} onCheckedChange={(value) => set("enabled", value)} />
          </div>

          <Field label="Title">
            <Input
              value={config.title}
              onChange={(event) => set("title", event.target.value)}
              className="h-11 bg-hero-field/70"
            />
          </Field>

          <Field label="Text in line">
            <Textarea
              rows={4}
              value={pointsText}
              onChange={(event) => setPointsText(event.target.value)}
              className="bg-hero-field/70"
              placeholder={DEFAULT_POINTS.join("\n")}
            />
          </Field>

          <Field label="Update Link">
            <Input
              value={config.update_link}
              onChange={(event) => set("update_link", event.target.value)}
              className="h-11 bg-hero-field/70"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cancel Button Text">
              <Input
                value={config.cancel_text}
                onChange={(event) => set("cancel_text", event.target.value)}
                className="h-11 bg-hero-field/70"
              />
            </Field>
            <Field label="Update Button Text">
              <Input
                value={config.update_text}
                onChange={(event) => set("update_text", event.target.value)}
                className="h-11 bg-hero-field/70"
              />
            </Field>
          </div>

          <Button onClick={save} disabled={saving} className="h-12 w-full rounded-xl shadow-hero-sm">
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
