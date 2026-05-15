import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Copy, Plus, ExternalLink, Trash2 } from "lucide-react";

type ConfigRow = {
  id: string;
  slug: string;
  enabled: boolean;
  title: string;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_configs")
      .select("id,slug,enabled,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as ConfigRow[]) ?? []);
    setLoading(false);
  }

  async function createConfig(e: React.FormEvent) {
    e.preventDefault();
    const slug = newSlug.trim().toLowerCase();
    if (!/^[a-z0-9._-]{1,80}$/.test(slug)) {
      toast.error("Slug: a-z 0-9 . _ - only");
      return;
    }
    setCreating(true);
    const { data: userRes } = await supabase.auth.getUser();
    const owner_id = userRes.user?.id;
    if (!owner_id) {
      toast.error("Not signed in");
      setCreating(false);
      return;
    }
    const { data, error } = await supabase
      .from("app_configs")
      .insert({
        slug,
        owner_id,
        points: ["🔥 Faster performance and smoother UI", "🛠️ Bug fixes & stability improvements"],
        update_link: "https://t.me/heromodss",
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewSlug("");
    navigate({ to: "/configs/$id", params: { id: data.id } });
  }

  async function toggleEnabled(row: ConfigRow, value: boolean) {
    const prev = row.enabled;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: value } : r)));
    const { error } = await supabase
      .from("app_configs")
      .update({ enabled: value })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: prev } : r)));
    }
  }

  async function remove(row: ConfigRow) {
    if (!confirm(`Delete "${row.slug}"?`)) return;
    const { error } = await supabase.from("app_configs").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success("Deleted");
  }

  function copyUrl(slug: string) {
    const url = `${origin}/api/public/config/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }

  return (
    <div className="space-y-8">
      <Toaster />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each config is exposed at a stable JSON URL the dex fetches. Toggle{" "}
          <span className="text-primary">enabled</span> to instantly show/hide the dialog.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={createConfig} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full space-y-2">
            <Label htmlFor="slug">New config slug (e.g. <code className="text-primary">5.6.80.171</code>)</Label>
            <Input
              id="slug"
              placeholder="my-app-v1"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={creating}>
            <Plus className="size-4 mr-1" />
            Create
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No configs yet. Create one above.
          </Card>
        ) : (
          rows.map((row) => {
            const url = `${origin}/api/public/config/${row.slug}`;
            return (
              <Card key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/configs/$id"
                      params={{ id: row.id }}
                      className="font-medium hover:text-primary truncate"
                    >
                      {row.slug}
                    </Link>
                    <Badge variant={row.enabled ? "default" : "secondary"}>
                      {row.enabled ? "live" : "off"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(v) => toggleEnabled(row, v)}
                  />
                  <Button variant="outline" size="icon" onClick={() => copyUrl(row.slug)} title="Copy URL">
                    <Copy className="size-4" />
                  </Button>
                  <a href={url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="icon" title="Open JSON">
                      <ExternalLink className="size-4" />
                    </Button>
                  </a>
                  <Button variant="outline" size="icon" onClick={() => remove(row)} title="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
