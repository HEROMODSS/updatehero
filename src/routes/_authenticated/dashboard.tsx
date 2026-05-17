import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Check, ChevronRight, Edit3, ExternalLink, Plus, Sparkles, Trash2, X } from "lucide-react";

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
  const [newVersion, setNewVersion] = useState("");
  const [creating, setCreating] = useState(false);
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({});
  const appInputRef = useRef<HTMLInputElement | null>(null);
  const versionInputRef = useRef<HTMLInputElement | null>(null);

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
    setOpenApps((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const row of list) {
        if (!(row.app_name in next)) next[row.app_name] = true;
      }
      return next;
    });
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ConfigRow[]>();
    for (const row of rows) {
      if (!map.has(row.app_name)) map.set(row.app_name, []);
      map.get(row.app_name)!.push(row);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function createConfig(e: React.FormEvent) {
    e.preventDefault();
    const app = newApp.trim();
    const version = newVersion.trim();
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(app)) {
      toast.error("App Name can use letters, digits, dots, dashes and underscores.");
      return;
    }
    if (!/^[A-Za-z0-9._-]{1,40}$/.test(version)) {
      toast.error("Version Number can use letters, digits, dots, dashes and underscores.");
      return;
    }

    setCreating(true);
    const { data: userRes } = await supabase.auth.getUser();
    const owner_id = userRes.user?.id;
    if (!owner_id) {
      toast.error("Please sign in again.");
      setCreating(false);
      return;
    }

    const { error } = await supabase.from("app_configs").insert({
      app_name: app,
      version,
      owner_id,
      credit: "Hero",
      title: "New update is live",
      points: ["Faster performance and smoother UI"],
      update_link: "https://t.me/heromodss",
      update_text: "UPDATE NOW",
    });
    setCreating(false);

    if (error) {
      toast.error(
        error.message.includes("duplicate") ? "This app version already exists." : error.message,
      );
      return;
    }

    setNewApp("");
    setNewVersion("");
    setOpenApps((prev) => ({ ...prev, [app]: true }));
    toast.success(`Added ${app} / ${version}`);
    void load();
  }

  async function toggleEnabled(row: ConfigRow, value: boolean) {
    const previous = row.enabled;
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, enabled: value } : item)),
    );
    const { error } = await supabase
      .from("app_configs")
      .update({ enabled: value })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, enabled: previous } : item)),
      );
    }
  }

  async function toggleAllForApp(app: string, value: boolean) {
    const ids = rows.filter((row) => row.app_name === app).map((row) => row.id);
    setRows((current) =>
      current.map((item) => (item.app_name === app ? { ...item, enabled: value } : item)),
    );
    const { error } = await supabase.from("app_configs").update({ enabled: value }).in("id", ids);
    if (error) {
      toast.error(error.message);
      void load();
    }
  }

  async function updateTitle(row: ConfigRow, title: string) {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, title } : item)));
    const { error } = await supabase.from("app_configs").update({ title }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  }

  async function remove(row: ConfigRow) {
    if (!confirm(`Delete ${row.app_name} / ${row.version}?`)) return;
    const { error } = await supabase.from("app_configs").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast.success("Deleted");
  }

  function addAnotherVersion(app: string) {
    setNewApp(app);
    setNewVersion("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => versionInputRef.current?.focus(), 250);
  }

  function liveUrl(row: ConfigRow) {
    return `${origin}/api/public/config/${row.app_name}/${row.version}`;
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      <Toaster />

      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-hero-glass px-5 py-6 shadow-hero backdrop-blur-xl sm:px-8 sm:py-8">
        <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
              <Sparkles className="mr-1 size-3" /> UpdateHero
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Manual app update control
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Add each app and version yourself. Only saved versions go live, so the old working
              method stays clean and predictable.
            </p>
          </div>
          <div className="rounded-xl border border-primary/15 bg-hero-glass-strong px-4 py-3 text-sm shadow-hero-sm backdrop-blur-xl">
            <p className="text-muted-foreground">Made with ❤️ by</p>
            <p className="text-lg font-semibold text-primary">Hero</p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-primary/20 bg-hero-glass shadow-hero backdrop-blur-xl">
        <div className="border-b border-primary/10 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold">Add app version</h2>
          <p className="text-sm text-muted-foreground">Boxes: App Name | Version Number</p>
        </div>
        <form
          onSubmit={createConfig}
          className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="app">App Name</Label>
            <Input
              ref={appInputRef}
              id="app"
              placeholder="Enter App Name here"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="h-12 bg-hero-field/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version Number</Label>
            <Input
              ref={versionInputRef}
              id="version"
              placeholder="Version Number"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="h-12 bg-hero-field/70"
            />
          </div>
          <Button type="submit" disabled={creating} className="h-12 rounded-xl shadow-hero-sm">
            <Plus className="size-4" />
            {creating ? "Adding…" : "Add"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <Card className="border-primary/15 bg-hero-glass p-8 text-center text-sm text-muted-foreground shadow-hero backdrop-blur-xl">
          Loading apps…
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-primary/15 bg-hero-glass p-10 text-center shadow-hero backdrop-blur-xl">
          <AndroidIcon className="mx-auto size-12" />
          <h3 className="mt-4 text-lg font-semibold">No app folder yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first App Name and Version Number above.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([app, versions], index) => {
            const isOpen = openApps[app] ?? true;
            const enabledCount = versions.filter((version) => version.enabled).length;
            const allOn = enabledCount === versions.length;
            const hasLive = enabledCount > 0;

            return (
              <Card
                key={app}
                className="overflow-hidden border-primary/15 bg-hero-glass shadow-hero backdrop-blur-xl animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
              >
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenApps((prev) => ({ ...prev, [app]: open }))}
                >
                  <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-3 text-left">
                      <ChevronRight
                        className={`size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                      <AndroidIcon />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-lg font-semibold">{app}</span>
                          <Badge variant="secondary">
                            {versions.length} version{versions.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge
                            className={
                              hasLive
                                ? "bg-primary/15 text-primary hover:bg-primary/20"
                                : "bg-secondary text-secondary-foreground"
                            }
                          >
                            {hasLive ? `${enabledCount} live` : "offline"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Android app folder</p>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xs font-medium text-muted-foreground">
                        {allOn ? "Enabled" : enabledCount === 0 ? "Disabled" : "Mixed"}
                      </span>
                      <Switch
                        checked={allOn}
                        onCheckedChange={(value) => toggleAllForApp(app, value)}
                        aria-label={`Toggle ${app}`}
                      />
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-primary/10">
                      <div className="hidden grid-cols-[minmax(90px,0.8fr)_minmax(160px,2fr)_auto_auto_auto_auto] items-center gap-3 px-6 py-3 text-xs font-semibold uppercase text-muted-foreground sm:grid">
                        <span>Version</span>
                        <span>Change Description</span>
                        <span>Update Toggle</span>
                        <span>Edit</span>
                        <span>Delete</span>
                        <span>Live</span>
                      </div>
                      <div className="divide-y divide-primary/10">
                        {versions.map((row) => (
                          <VersionRow
                            key={row.id}
                            row={row}
                            liveUrl={liveUrl(row)}
                            onToggle={(value) => toggleEnabled(row, value)}
                            onUpdateTitle={(title) => updateTitle(row, title)}
                            onDelete={() => remove(row)}
                          />
                        ))}
                      </div>
                      <div className="px-5 py-4 sm:px-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addAnotherVersion(app)}
                          className="rounded-xl bg-hero-glass-strong"
                        >
                          <Plus className="size-4" />
                          Add another version of this app
                        </Button>
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
  liveUrl,
  onToggle,
  onUpdateTitle,
  onDelete,
}: {
  row: ConfigRow;
  liveUrl: string;
  onToggle: (value: boolean) => void;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.title);

  useEffect(() => {
    if (!editing) setDraft(row.title);
  }, [editing, row.title]);

  function commit() {
    const title = draft.trim();
    if (title && title !== row.title) onUpdateTitle(title);
    setEditing(false);
  }

  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(90px,0.8fr)_minmax(160px,2fr)_auto_auto_auto_auto] sm:items-center sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:hidden">Version</span>
        <code className="rounded-lg bg-hero-field px-2.5 py-1 text-xs font-semibold text-foreground">
          {row.version}
        </code>
      </div>

      <div className="min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
                if (event.key === "Escape") {
                  setDraft(row.title);
                  setEditing(false);
                }
              }}
              className="h-9 bg-hero-field/80"
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-9"
              onClick={commit}
              title="Save text"
            >
              <Check className="size-4 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-9"
              onClick={() => {
                setDraft(row.title);
                setEditing(false);
              }}
              title="Cancel"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 truncate text-left text-sm hover:text-primary"
            title="Click to edit description"
          >
            {row.title}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:hidden">Update Toggle</span>
        <Switch
          checked={row.enabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${row.version}`}
        />
      </div>

      <Link to="/configs/$id" params={{ id: row.id }} className="w-fit">
        <Button variant="ghost" size="sm" className="rounded-xl" title="Edit">
          <Edit3 className="size-4" />
          <span className="sm:hidden">Edit</span>
        </Button>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="w-fit rounded-xl"
        title="Delete"
      >
        <Trash2 className="size-4" />
        <span className="sm:hidden">Delete</span>
      </Button>

      <a href={liveUrl} target="_blank" rel="noreferrer" className="w-fit">
        <Badge
          className={
            row.enabled
              ? "bg-primary/15 text-primary hover:bg-primary/20"
              : "bg-secondary text-secondary-foreground"
          }
        >
          {row.enabled ? "live" : "disabled"}
          <ExternalLink className="ml-1 size-3" />
        </Badge>
      </a>
    </div>
  );
}

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-hero-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
        <path d="M6 10v6a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 1 1 3 0Zm15 0v6a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 1 1 3 0ZM7 10.5h10V18a1 1 0 0 1-1 1h-1.25v2.25a1.25 1.25 0 1 1-2.5 0V19h-2.5v2.25a1.25 1.25 0 1 1-2.5 0V19H8a1 1 0 0 1-1-1v-7.5ZM8.5 9C7.4 9 7 8.4 7 7.5c0-1.9 1.2-3.55 3-4.43l-.7-1.27a.4.4 0 0 1 .7-.4l.74 1.33A6.6 6.6 0 0 1 12 2.5c.8 0 1.55.1 2.26.23l.74-1.33a.4.4 0 1 1 .7.4l-.7 1.27c1.8.88 3 2.53 3 4.43 0 .9-.4 1.5-1.5 1.5h-8ZM10 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm4 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    </span>
  );
}
