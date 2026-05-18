import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

const DEFAULT_POINTS = [
  "🔥 Faster performance and smoother UI",
  "🔒 Improved security and privacy handling",
];

type ConfigRow = {
  id: string;
  app_name: string;
  version: string;
  enabled: boolean;
  title: string;
  created_at: string;
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
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAllApps, setShowAllApps] = useState<Record<string, boolean>>({});
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
      .select("id,app_name,version,enabled,title,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data as ConfigRow[]) ?? []).sort(sortNewestFirst));
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) =>
          [row.app_name, row.version, row.title].some((value) =>
            value.toLowerCase().includes(needle),
          ),
        )
      : rows;

    const map = new Map<string, ConfigRow[]>();
    for (const row of filtered) {
      if (!map.has(row.app_name)) map.set(row.app_name, []);
      map.get(row.app_name)!.push(row);
    }

    return Array.from(map.entries())
      .map(([app, versions]) => [app, versions.sort(sortNewestFirst)] as const)
      .sort((a, b) => newestTimestamp(b[1]) - newestTimestamp(a[1]));
  }, [query, rows]);

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
      credit: "HERO",
      enabled: true,
      title: "🚀 New Update is Live!",
      points: DEFAULT_POINTS,
      update_link: "https://t.me/heromodss",
      cancel_text: "NOT NOW",
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
    setShowAllApps((prev) => ({ ...prev, [app]: true }));
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
    return `${origin}/api/public/config/${encodeURIComponent(row.app_name)}/${encodeURIComponent(
      row.version,
    )}`;
  }

  async function copyLink(row: ConfigRow) {
    await navigator.clipboard.writeText(liveUrl(row));
    toast.success("Config link copied");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in-50 duration-500">
      <Toaster />

      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-hero-glass px-5 py-5 shadow-hero backdrop-blur-xl sm:px-6">
        <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">UpdateHero</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              Update system
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Add exact app versions, copy the config link, then control each update with one
              toggle.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-hero-glass-strong px-3 py-2 shadow-hero-sm">
            <AndroidIcon className="size-9" />
            <div className="text-xs">
              <p className="font-semibold">{rows.length} versions</p>
              <p className="text-muted-foreground">
                {rows.filter((row) => row.enabled).length} live
              </p>
            </div>
          </div>
        </div>
      </section>

      <Card className="border-primary/20 bg-hero-glass p-4 shadow-hero backdrop-blur-xl sm:p-5">
        <form
          onSubmit={createConfig}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="app">App Name</Label>
            <Input
              ref={appInputRef}
              id="app"
              placeholder="App Name"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="h-11 bg-hero-field/70"
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
              className="h-11 bg-hero-field/70"
            />
          </div>
          <Button type="submit" disabled={creating} className="h-11 rounded-xl shadow-hero-sm">
            <Plus className="size-4" />
            {creating ? "Adding…" : "Add"}
          </Button>
        </form>
      </Card>

      <div className="relative">
        <AndroidIcon className="absolute left-3 top-1/2 size-8 -translate-y-1/2" />
        <Search className="absolute left-13 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search folder or version"
          className="h-12 rounded-2xl bg-hero-glass pl-20 shadow-hero-sm backdrop-blur-xl"
        />
      </div>

      {loading ? (
        <Card className="border-primary/15 bg-hero-glass p-8 text-center text-sm text-muted-foreground shadow-hero backdrop-blur-xl">
          Loading apps…
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-primary/15 bg-hero-glass p-8 text-center shadow-hero backdrop-blur-xl">
          <AndroidIcon className="mx-auto size-12" />
          <h3 className="mt-4 text-base font-semibold">No app folder found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add App Name + Version Number to create the first folder.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([app, versions], index) => {
            const activeCount = versions.filter((version) => version.enabled).length;
            const showAll = showAllApps[app] ?? false;
            const visibleVersions = showAll ? versions : versions.slice(0, 2);

            return (
              <Card
                key={app}
                className="overflow-hidden border-primary/15 bg-hero-glass shadow-hero backdrop-blur-xl animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: `${Math.min(index * 45, 180)}ms` }}
              >
                <div className="flex items-center gap-3 border-b border-primary/10 px-4 py-3 sm:px-5">
                  <AndroidIcon />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-base font-semibold sm:text-lg">{app}</h2>
                      <Badge variant="secondary" className="shrink-0">
                        {versions.length} total
                      </Badge>
                      <Badge className="shrink-0 bg-primary/15 text-primary hover:bg-primary/20">
                        {activeCount} live
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addAnotherVersion(app)}
                    className="size-9 shrink-0 rounded-xl bg-hero-glass-strong"
                    title="Add another version"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div className="divide-y divide-primary/10">
                  {visibleVersions.map((row) => (
                    <VersionRow
                      key={row.id}
                      row={row}
                      onCopy={() => copyLink(row)}
                      onToggle={(value) => toggleEnabled(row, value)}
                      onDelete={() => remove(row)}
                    />
                  ))}
                </div>

                {versions.length > 2 && (
                  <div className="px-4 py-3 sm:px-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllApps((prev) => ({ ...prev, [app]: !showAll }))}
                      className="rounded-xl"
                    >
                      <ChevronDown className={`size-4 transition ${showAll ? "rotate-180" : ""}`} />
                      {showAll ? "Show less" : `Show all ${versions.length} versions`}
                    </Button>
                  </div>
                )}
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
  onCopy,
  onToggle,
  onDelete,
}: {
  row: ConfigRow;
  onCopy: () => void;
  onToggle: (value: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">VERSION =</span>
        <code className="truncate rounded-lg bg-hero-field px-2.5 py-1 text-xs font-semibold text-foreground">
          {row.version}
        </code>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          className="size-8 shrink-0 rounded-xl"
          title="Copy config link"
        >
          <Copy className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={row.enabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${row.version}`}
        />
        <Badge
          variant="secondary"
          className={
            row.enabled
              ? "bg-primary/15 text-primary hover:bg-primary/20"
              : "bg-secondary text-secondary-foreground"
          }
          title={row.enabled ? "Live" : "Disabled"}
        >
          {row.enabled ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
        </Badge>
        <Link to="/configs/$id" params={{ id: row.id }}>
          <Button variant="ghost" size="icon" className="size-8 rounded-xl" title="Edit">
            <Edit3 className="size-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="size-8 rounded-xl"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
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

function sortNewestFirst(a: ConfigRow, b: ConfigRow) {
  return Date.parse(b.created_at || b.updated_at) - Date.parse(a.created_at || a.updated_at);
}

function newestTimestamp(rows: ConfigRow[]) {
  return Math.max(...rows.map((row) => Date.parse(row.created_at || row.updated_at)));
}
