import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
};

const DEFAULTS: Defaults = {
  title: "🚀 New Update is Live!",
  points: DEFAULT_POINTS,
  update_link: "https://t.me/heromodss",
  cancel_text: "NOT NOW",
  update_text: "UPDATE NOW",
};

function SettingsPage() {
  const [state, setState] = useState<Defaults>(DEFAULTS);
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
        .select("title,points,update_link,cancel_text,update_text")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (data) {
        const points = Array.isArray(data.points) ? (data.points as string[]) : DEFAULT_POINTS;
        setState({
          title: data.title,
          points,
          update_link: data.update_link,
          cancel_text: data.cancel_text,
          update_text: data.update_text,
        });
        setPointsText(points.join("\n"));
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    const { data: userRes } = await supabase.auth.getUser();
    const ownerId = userRes.user?.id;
    if (!ownerId) return;
    const points = pointsText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    setSaving(true);
    const { error } = await supabase.from("user_defaults").upsert({
      owner_id: ownerId,
      title: state.title || DEFAULTS.title,
      points: points.length ? points : DEFAULT_POINTS,
      update_link: state.update_link || DEFAULTS.update_link,
      cancel_text: state.cancel_text || DEFAULTS.cancel_text,
      update_text: state.update_text || DEFAULTS.update_text,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Defaults saved — used for every new version.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in-50 duration-500">
      <Toaster />
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <Card className="overflow-hidden border-primary/20 bg-hero-glass shadow-hero backdrop-blur-xl">
        <div className="border-b border-primary/10 p-5">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            <SettingsIcon className="mr-1 size-3" /> Default settings
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Update dialog defaults</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These values prefill every new app version you add. You can still edit any version
            individually later.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <Field label="Dialog Title">
                <Input
                  value={state.title}
                  onChange={(e) => setState({ ...state, title: e.target.value })}
                  className="h-11 bg-hero-field/70"
                />
              </Field>

              <Field label="Text in lines">
                <Textarea
                  rows={4}
                  value={pointsText}
                  onChange={(e) => setPointsText(e.target.value)}
                  className="bg-hero-field/70"
                  placeholder={DEFAULT_POINTS.join("\n")}
                />
              </Field>

              <Field label="Update Link">
                <Input
                  value={state.update_link}
                  onChange={(e) => setState({ ...state, update_link: e.target.value })}
                  className="h-11 bg-hero-field/70"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cancel Button">
                  <Input
                    value={state.cancel_text}
                    onChange={(e) => setState({ ...state, cancel_text: e.target.value })}
                    className="h-11 bg-hero-field/70"
                  />
                </Field>
                <Field label="Update Button">
                  <Input
                    value={state.update_text}
                    onChange={(e) => setState({ ...state, update_text: e.target.value })}
                    className="h-11 bg-hero-field/70"
                  />
                </Field>
              </div>

              <Button
                onClick={save}
                disabled={saving}
                className="h-12 w-full rounded-xl shadow-hero-sm"
              >
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
