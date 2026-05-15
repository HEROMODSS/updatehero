import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Copy } from "lucide-react";

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
  const [c, setC] = useState<Config | null>(null);
  const [pointsText, setPointsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
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
    const points = Array.isArray(data.points) ? (data.points as string[]) : [];
    setC({
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

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    if (!c) return;
    setC({ ...c, [k]: v });
  }

  async function save() {
    if (!c) return;
    const points = pointsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    const { error } = await supabase
      .from("app_configs")
      .update({
        app_name: c.app_name,
        version: c.version,
        credit: c.credit,
        enabled: c.enabled,
        title: c.title,
        points,
        update_link: c.update_link,
        cancel_text: c.cancel_text,
        update_text: c.update_text,
      })
      .eq("id", c.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setC({ ...c, points });
  }

  if (!c) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const url = `${origin}/api/public/config/${c.app_name}/${c.version}`;
  const previewJson = JSON.stringify(
    {
      credit: c.credit,
      enabled: c.enabled,
      title: c.title,
      points: pointsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      update_link: c.update_link,
      cancel_text: c.cancel_text,
      update_text: c.update_text,
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {c.app_name} <span className="text-muted-foreground">/</span> {c.version}
        </h1>
      </div>

      <Card className="p-4 flex items-center gap-3">
        <code className="flex-1 text-xs sm:text-sm break-all text-muted-foreground">
          {url}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast.success("Copied");
          }}
        >
          <Copy className="size-4 mr-1" /> Copy
        </Button>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                When off, the dialog won't show.
              </p>
            </div>
            <Switch
              checked={c.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="App name">
              <Input
                value={c.app_name}
                onChange={(e) => set("app_name", e.target.value)}
              />
            </Field>
            <Field label="Version">
              <Input
                value={c.version}
                onChange={(e) => set("version", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Title">
            <Input value={c.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Credit">
            <Input
              value={c.credit}
              onChange={(e) => set("credit", e.target.value)}
            />
          </Field>
          <Field label="Points (one per line)">
            <Textarea
              rows={5}
              value={pointsText}
              onChange={(e) => setPointsText(e.target.value)}
            />
          </Field>
          <Field label="Update link">
            <Input
              value={c.update_link}
              onChange={(e) => set("update_link", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cancel text">
              <Input
                value={c.cancel_text}
                onChange={(e) => set("cancel_text", e.target.value)}
              />
            </Field>
            <Field label="Update text">
              <Input
                value={c.update_text}
                onChange={(e) => set("update_text", e.target.value)}
              />
            </Field>
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Card>

        <Card className="p-6">
          <Label className="text-base">JSON preview</Label>
          <p className="text-xs text-muted-foreground mb-2">
            This is exactly what the dex receives.
          </p>
          <pre className="bg-muted/50 rounded-md p-4 text-xs overflow-auto max-h-[600px] border border-border">
            {previewJson}
          </pre>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
