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
import { ArrowLeft, Heart, Save, Sparkles } from "lucide-react";

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
    const points = Array.isArray(data.points) ? (data.points as string[]) : [];
    setConfig({
      id: data.id,
      app_name: data.app_name,
      version: data.version,
      credit: data.credit,
      enabled: data.enabled,
      title: data.title,
      points,
      update_link: data.update_link,
      cancel_text: data.cancel_text,
      update_text: data.update_text,
    });
    setPointsText(points.join("\n"));
  }

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  async function save() {
    if (!config) return;
    const points = pointsText.split("\n").map((point) => point.trim()).filter(Boolean);
    setSaving(true);
    const { error } = await supabase
      .from("app_configs")
      .update({
        app_name: config.app_name,
        version: config.version,
        credit: "Made with ❤️ by Hero",
        enabled: config.enabled,
        title: config.title,
        points,
        update_link: config.update_link,
        cancel_text: "",
        update_text: config.update_text || "UPDATE NOW",
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setConfig({ ...config, credit: "Made with ❤️ by Hero", points, cancel_text: "" });
  }

  if (!config) {
    return (
      <Card className="border-primary/15 bg-hero-glass p-8 text-center text-sm text-muted-foreground shadow-hero backdrop-blur-xl">
        Loading settings…
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
      <Toaster />
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-hero-glass p-6 shadow-hero backdrop-blur-xl">
          <div className="h-px [background:var(--hero-sheen)]" />
          <Badge className="mt-5 bg-primary/15 text-primary hover:bg-primary/20">
            <Sparkles className="mr-1 size-3" /> Version editor
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {config.app_name} <span className="text-muted-foreground">/</span> {config.version}
          </h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="size-4 text-primary" /> by Hero
          </p>
        </div>
      </div>

      <Card className="space-y-5 border-primary/20 bg-hero-glass p-5 shadow-hero backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/10 bg-hero-glass-strong p-4">
          <div>
            <Label className="text-base">Update Toggle</Label>
            <p className="mt-1 text-xs text-muted-foreground">When disabled, this version stays off.</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(value) => set("enabled", value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="App Name">
            <Input value={config.app_name} onChange={(event) => set("app_name", event.target.value)} className="h-11 bg-hero-field/70" />
          </Field>
          <Field label="Version Number">
            <Input value={config.version} onChange={(event) => set("version", event.target.value)} className="h-11 bg-hero-field/70" />
          </Field>
        </div>

        <Field label="Title">
          <Input value={config.title} onChange={(event) => set("title", event.target.value)} className="h-11 bg-hero-field/70" />
        </Field>

        <Field label="Change Description">
          <Textarea rows={5} value={pointsText} onChange={(event) => setPointsText(event.target.value)} className="bg-hero-field/70" />
        </Field>

        <Field label="Update Link">
          <Input value={config.update_link} onChange={(event) => set("update_link", event.target.value)} className="h-11 bg-hero-field/70" />
        </Field>

        <Field label="Update Button Text">
          <Input value={config.update_text} onChange={(event) => set("update_text", event.target.value)} className="h-11 bg-hero-field/70" />
        </Field>

        <Button onClick={save} disabled={saving} className="h-12 w-full rounded-xl shadow-hero-sm">
          <Save className="size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
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
