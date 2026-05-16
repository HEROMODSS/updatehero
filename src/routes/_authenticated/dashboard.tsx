import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Trash2,
  ChevronRight,
  Settings2,
  Check,
  X,
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
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [newApp, setNewApp] = useState("");
  const [newVersion, setNewVersion] = useState("default");
  const [creating, setCreating] = useState(false);
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({});
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
    // Poll so auto-created versions (from dex calls) appear without refresh.
    pollRef.current = window.setInterval(() => void load(true), 8000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("app_configs")
      .select("id,app_name,version,enabled,title,updated_at")
      .order("app_name", { ascending: true })
      .order("version", { ascending: false });
    if (error && !silent) toast.error(error.message);
    const list = (data as ConfigRow[]) ?? [];
    setRows((prev) => {
      // Preserve open state for known apps; open newly-discovered ones.
      const next: Record<string, boolean> = { ...openApps };
      for (const r of list) if (!(r.app_name in next)) next[r.app_name] = true;
      setOpenApps(next);
      return list;
    });
    if (!silent) setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
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
      toast.error("App name: letters, digits, . _ -");
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
    const { error } = await supabase
      .from("app_configs")
      .insert({
        app_name: app,
        version,
        owner_id,
        title: "🔔 Update Available!",
        points: [
          "🔥 Faster performance and smoother UI",
          "🛠️ Bug fixes & stability improvements",
        ],
        update_link: "https://t.me/heromodss",
      });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewApp("");
    setNewVersion("default");
    toast.success(`Added ${app} / ${version}`);
    void load();
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

  async function toggleAllForApp(app: string, value: boolean) {
    const ids = rows.filter((r) => r.app_name === app).map((r) => r.id);
    setRows((rs) =>
      rs.map((r) => (r.app_name === app ? { ...r, enabled: value } : r)),
    );
    const { error } = await supabase
      .from("app_configs")
      .update({ enabled: value })
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      void load();
    }
  }

  async function updateTitle(row: ConfigRow, title: string) {
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, title } : r)),
    );
    const { error } = await supabase
      .from("app_configs")
      .update({ title })
      .eq("id", row.id);
    if (error) toast.error(error.message);
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

  function appUrlTemplate(app: string) {
    return `${origin}/api/public/config/${app}/<VERSION_NAME>`;
  }

  return (
    <div className="space-y-8">
      <Toaster />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One URL per app. New versions appear here automatically the moment
            the dex calls home.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <Card className="p-6 border-primary/30 bg-primary/[0.02]">
        <form
          onSubmit={createConfig}
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="app">Enter App Name here</Label>
            <Input
              id="app"
              placeholder="com.vanced.android.youtube"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ver">App Version here</Label>
            <Input
              id="ver"
              placeholder="default"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={creating}>
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: create a <code className="text-primary">default</code> version
          first. Every new version users open will auto-inherit from it.
        </p>
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
            const allOn = enabledCount === versions.length;
            return (
              <Card key={app} className="overflow-hidden">
                <Collapsible
                  open={isOpen}
                  onOpenChange={(o) =>
                    setOpenApps((prev) => ({ ...prev, [app]: o }))
                  }
                >
                  <div className="px-5 py-4 flex items-center gap-3">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80">
                      <ChevronRight
                        className={`size-4 transition-transform text-muted-foreground ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                      <AndroidIcon />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{app}</span>
                          <Badge variant="secondary">
                            {versions.length}{" "}
                            {versions.length === 1 ? "version" : "versions"}
                          </Badge>
                          {enabledCount > 0 && (
                            <Badge>{enabledCount} live</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {appUrlTemplate(app)}
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {allOn ? "All on" : enabledCount === 0 ? "All off" : "Mixed"}
                        </span>
                        <Switch
                          checked={allOn}
                          onCheckedChange={(v) => toggleAllForApp(app, v)}
                          aria-label="Toggle all versions"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(appUrlTemplate(app));
                          toast.success("URL copied");
                        }}
                      >
                        <Copy className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">Copy URL</span>
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="border-t border-border divide-y divide-border">
                      {versions.map((row) => (
                        <VersionRow
                          key={row.id}
                          row={row}
                          onToggle={(v) => toggleEnabled(row, v)}
                          onUpdateTitle={(t) => updateTitle(row, t)}
                          onDelete={() => remove(row)}
                        />
                      ))}
                      <div className="px-5 py-3 bg-muted/20">
                        <button
                          onClick={() => {
                            setNewApp(app);
                            setNewVersion("");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                        >
                          <Plus className="size-3" /> Add a version of {app} manually
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

function VersionRow({
  row,
  onToggle,
  onUpdateTitle,
  onDelete,
}: {
  row: ConfigRow;
  onToggle: (v: boolean) => void;
  onUpdateTitle: (t: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.title);

  useEffect(() => {
    if (!editing) setDraft(row.title);
  }, [row.title, editing]);

  function commit() {
    const t = draft.trim();
    if (t && t !== row.title) onUpdateTitle(t);
    setEditing(false);
  }

  return (
    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <code className="text-xs px-2 py-0.5 rounded bg-muted/60 text-foreground shrink-0">
          {row.version}
        </code>
        <span className="text-muted-foreground hidden sm:inline">|</span>
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(row.title);
                  setEditing(false);
                }
              }}
              className="h-8 text-sm"
            />
            <Button size="icon" variant="ghost" className="size-7" onClick={commit}>
              <Check className="size-4 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => {
                setDraft(row.title);
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 min-w-0 text-left text-sm truncate hover:text-primary"
            title="Click to edit"
          >
            {row.title}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={row.enabled ? "default" : "secondary"}>
          {row.enabled ? "enabled" : "disabled"}
        </Badge>
        <Switch checked={row.enabled} onCheckedChange={onToggle} />
        <Link to="/configs/$id" params={{ id: row.id }}>
          <Button variant="ghost" size="icon" title="Advanced settings">
            <Settings2 className="size-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function AndroidIcon() {
  // Classic Android head silhouette.
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M6 10v6a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 1 1 3 0Zm15 0v6a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 1 1 3 0ZM7 10.5h10V18a1 1 0 0 1-1 1h-1.25v2.25a1.25 1.25 0 1 1-2.5 0V19h-2.5v2.25a1.25 1.25 0 1 1-2.5 0V19H8a1 1 0 0 1-1-1v-7.5ZM8.5 9C7.4 9 7 8.4 7 7.5c0-1.9 1.2-3.55 3-4.43l-.7-1.27a.4.4 0 0 1 .7-.4l.74 1.33A6.6 6.6 0 0 1 12 2.5c.8 0 1.55.1 2.26.23l.74-1.33a.4.4 0 1 1 .7.4l-.7 1.27c1.8.88 3 2.53 3 4.43 0 .9-.4 1.5-1.5 1.5h-8ZM10 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm4 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    </span>
  );
}
