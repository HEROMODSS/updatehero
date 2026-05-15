import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Copy,
  Plus,
  ExternalLink,
  Trash2,
  ChevronRight,
  Folder,
} from "lucide-react";

type ConfigRow = {
  id: string;
  app_name: string;
  version: string;
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
  const [newApp, setNewApp] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [creating, setCreating] = useState(false);
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_configs")
      .select("id,app_name,version,enabled,title,updated_at")
      .order("app_name", { ascending: true })
      .order("version", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as ConfigRow[]) ?? [];
    setRows(list);
    // open all by default
    const open: Record<string, boolean> = {};
    for (const r of list) open[r.app_name] = true;
    setOpenApps(open);
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ConfigRow[]>();
    for (const r of rows) {
      if (!map.has(r.app_name)) map.set(r.app_name, []);
      map.get(r.app_name)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function createConfig(e: React.FormEvent) {
    e.preventDefault();
    const app = newApp.trim();
    const version = newVersion.trim() || "default";
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(app)) {
      toast.error("App: letters, digits, . _ -");
      return;
    }
    if (!/^[A-Za-z0-9._-]{1,40}$/.test(version)) {
      toast.error("Version: letters, digits, . _ -");
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
        app_name: app,
        version,
        owner_id,
        points: [
          "🔥 Faster performance and smoother UI",
          "🛠️ Bug fixes & stability improvements",
        ],
        update_link: "https://t.me/heromodss",
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewApp("");
    setNewVersion("");
    navigate({ to: "/configs/$id", params: { id: data.id } });
  }

  async function toggleEnabled(row: ConfigRow, value: boolean) {
    const prev = row.enabled;
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, enabled: value } : r)),
    );
    const { error } = await supabase
      .from("app_configs")
      .update({ enabled: value })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, enabled: prev } : r)),
      );
    }
  }

  async function remove(row: ConfigRow) {
    if (!confirm(`Delete ${row.app_name} / ${row.version}?`)) return;
    const { error } = await supabase
      .from("app_configs")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success("Deleted");
  }

  function urlFor(row: ConfigRow) {
    return `${origin}/api/public/config/${row.app_name}/${row.version}`;
  }

  function appUrlTemplate(app: string) {
    return `${origin}/api/public/config/${app}/<VERSION_NAME>`;
  }

  return (
    <div className="space-y-8">
      <Toaster />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One URL per app. The dex appends the version automatically:{" "}
          <code className="text-primary text-xs">
            /api/public/config/&lt;app&gt;/&lt;version&gt;
          </code>
          . Toggle <span className="text-primary">enabled</span> per version.
        </p>
      </div>

      <Card className="p-6">
        <form
          onSubmit={createConfig}
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="app">App name</Label>
            <Input
              id="app"
              placeholder="YouTube"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ver">Version</Label>
            <Input
              id="ver"
              placeholder="v123 or 5.6.80.171"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={creating}>
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No apps yet. Add one above.
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([app, versions]) => {
            const isOpen = openApps[app] ?? true;
            const enabledCount = versions.filter((v) => v.enabled).length;
            return (
              <Card key={app} className="overflow-hidden">
                <Collapsible
                  open={isOpen}
                  onOpenChange={(o) =>
                    setOpenApps((prev) => ({ ...prev, [app]: o }))
                  }
                >
                  <CollapsibleTrigger className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/40 text-left">
                    <ChevronRight
                      className={`size-4 transition-transform text-muted-foreground ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    />
                    <Folder className="size-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{app}</span>
                        <Badge variant="secondary">
                          {versions.length} version
                          {versions.length !== 1 ? "s" : ""}
                        </Badge>
                        {enabledCount > 0 && (
                          <Badge>{enabledCount} live</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {appUrlTemplate(app)}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(appUrlTemplate(app));
                          toast.success("URL template copied");
                        }}
                      >
                        <Copy className="size-4 mr-1" /> Copy
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border divide-y divide-border">
                      {versions.map((row) => {
                        const url = urlFor(row);
                        return (
                          <div
                            key={row.id}
                            className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  to="/configs/$id"
                                  params={{ id: row.id }}
                                  className="font-medium hover:text-primary truncate"
                                >
                                  {row.version}
                                </Link>
                                <Badge
                                  variant={row.enabled ? "default" : "secondary"}
                                >
                                  {row.enabled ? "live" : "off"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {url}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={row.enabled}
                                onCheckedChange={(v) => toggleEnabled(row, v)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(url);
                                  toast.success("URL copied");
                                }}
                                title="Copy URL"
                              >
                                <Copy className="size-4" />
                              </Button>
                              <a href={url} target="_blank" rel="noreferrer">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Open JSON"
                                >
                                  <ExternalLink className="size-4" />
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(row)}
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-5 py-3 bg-muted/20">
                        <button
                          onClick={() => {
                            setNewApp(app);
                            setNewVersion("");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                        >
                          <Plus className="size-3" /> Add another version of{" "}
                          {app}
                        </button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
