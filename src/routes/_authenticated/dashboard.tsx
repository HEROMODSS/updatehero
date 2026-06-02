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
const PUBLIC_CONFIG_ORIGIN = "https://updatehero.lovable.app";

type ConfigRow = {
  id: string;
  app_name: string;
  version: string;
  enabled: boolean;
  title: string;
  created_at: string;
  updated_at: string;
};

type UserDefaults = {
  username: string | null;
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
  raw_json: unknown;
  enabled_key: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<UserDefaults | null>(null);
  const [newApp, setNewApp] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAllApps, setShowAllApps] = useState<Record<string, boolean>>({});
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: userRes }] = await Promise.all([supabase.auth.getUser()]);
    const ownerId = userRes.user?.id;
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const [configs, defs] = await Promise.all([
      supabase
        .from("app_configs")
        .select("id,app_name,version,enabled,title,created_at,updated_at")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_defaults")
        .select("username,title,points,update_link,cancel_text,update_text,raw_json,enabled_key")
        .eq("owner_id", ownerId)
        .maybeSingle(),
    ]);
    if (configs.error) toast.error(configs.error.message);
    setRows(((configs.data as ConfigRow[]) ?? []).sort(sortNewestFirst));
    if (defs.data) {
      setDefaults({
        username: defs.data.username,
        title: defs.data.title,
        points: Array.isArray(defs.data.points) ? (defs.data.points as string[]) : DEFAULT_POINTS,
        update_link: defs.data.update_link,
        cancel_text: defs.data.cancel_text,
        update_text: defs.data.update_text,
        raw_json: defs.data.raw_json,
        enabled_key: defs.data.enabled_key || "enabled",
      });
    } else {
      setDefaults({
        username: null,
        title: "🚀 New Update is Live!",
        points: DEFAULT_POINTS,
        update_link: "https://t.me/heromodss",
        cancel_text: "NOT NOW",
        update_text: "UPDATE NOW",
        raw_json: null,
        enabled_key: "enabled",
      });
    }
    setLoading(false);
  }

  const username = defaults?.username ?? "";

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) =>
          [row.app_name, row.version, row.title].some((v) => v.toLowerCase().includes(needle)),
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
    if (!username) {
      toast.error("Set your username in Settings first.");
      return;
    }
    const rawApp = newApp.trim();
    const version = newVersion.trim();
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(rawApp)) {
      toast.error("App Name: letters/digits/./_/- only, no spaces.");
      return;
    }
    if (!/^[A-Za-z0-9._-]{1,40}$/.test(version)) {
      toast.error("Version Number: letters/digits/./_/- only, no spaces.");
      return;
    }

    const prefixedApp = `${username}-${rawApp}`;

    setCreating(true);
    const { data: userRes } = await supabase.auth.getUser();
    const owner_id = userRes.user?.id;
    if (!owner_id) {
      toast.error("Please sign in again.");
      setCreating(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("app_configs")
      .insert({
        app_name: prefixedApp,
        version,
        owner_id,
        credit: "HERO",
        enabled: true,
        title: defaults?.title || "🚀 New Update is Live!",
        points: defaults?.points?.length ? defaults.points : DEFAULT_POINTS,
        update_link: defaults?.update_link || "https://t.me/heromodss",
        cancel_text: defaults?.cancel_text || "NOT NOW",
        update_text: defaults?.update_text || "UPDATE NOW",
        enabled_key: defaults?.enabled_key || "enabled",
        raw_json: (defaults?.raw_json ?? null) as never,
      })
      .select("id,app_name,version,enabled,title,created_at,updated_at")
      .single();
    setCreating(false);

    if (error) {
      toast.error(
        error.message.includes("app_configs_app_version_idx") ||
          error.message.toLowerCase().includes("duplicate")
          ? `"${prefixedApp} / ${version}" already exists.`
          : error.message,
      );
      return;
    }

    if (inserted) {
      setRows((current) => [inserted as ConfigRow, ...current].sort(sortNewestFirst));
    }
    setNewApp("");
    setNewVersion("");
    setShowAllApps((prev) => ({ ...prev, [prefixedApp]: true }));
    toast.success(`Added ${prefixedApp} / ${version}`);
  }

  async function toggleEnabled(row: ConfigRow, value: boolean) {
    const previous = row.enabled;
    setRows((c) => c.map((i) => (i.id === row.id ? { ...i, enabled: value } : i)));
    const { error } = await supabase
      .from("app_configs")
      .update({ enabled: value })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((c) => c.map((i) => (i.id === row.id ? { ...i, enabled: previous } : i)));
    }
  }

  async function remove(row: ConfigRow) {
    if (!confirm(`Delete ${row.app_name} / ${row.version}?`)) return;
    const { error } = await supabase.from("app_configs").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((c) => c.filter((i) => i.id !== row.id));
    toast.success("Deleted");
  }

  function addAnotherVersion(app: string) {
    // strip the "username-" prefix so the input shows just the app part
    const stripped = username && app.startsWith(`${username}-`) ? app.slice(username.length + 1) : app;
    setNewApp(stripped);
    setNewVersion("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => versionInputRef.current?.focus(), 200);
  }

  function liveUrl(row: ConfigRow) {
    return `${PUBLIC_CONFIG_ORIGIN}/api/public/config/${encodeURIComponent(row.app_name)}/${encodeURIComponent(row.version)}`;
  }

  async function copyLink(row: ConfigRow) {
    await navigator.clipboard.writeText(liveUrl(row));
    toast.success("Config link copied");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in-50 duration-300">
      <Toaster />

      <section className="rounded-2xl border border-border bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">UpdateHero</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              Update system
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Add app versions, copy the config link, then toggle each update live or off.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-hero-glass-strong px-3 py-2">
            <AndroidIcon className="size-9" />
            <div className="text-xs">
              <p className="font-semibold">{rows.length} versions</p>
              <p className="text-muted-foreground">
                {rows.filter((r) => r.enabled).length} live
              </p>
            </div>
          </div>
        </div>
      </section>

      {!loading && !username && (
        <Card className="border-primary/40 bg-card p-4 text-sm">
          You need a <span className="text-primary font-medium">username</span> before adding apps.
          It's prefixed to every app name so your links stay unique.{" "}
          <Link to="/settings" className="text-primary underline">
            Set it now
          </Link>
          .
        </Card>
      )}

      <Card className="border-border bg-card p-4 sm:p-5">
        <form
          onSubmit={createConfig}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="app">App Name</Label>
            <div className="flex h-11 items-stretch rounded-md border border-input bg-hero-field">
              <span className="flex select-none items-center rounded-l-md border-r border-input bg-muted px-3 text-xs font-mono text-primary">
                {username || "username"}-
              </span>
              <Input
                id="app"
                placeholder="AppName"
                value={newApp}
                onChange={(e) => setNewApp(e.target.value)}
                className="h-full border-0 bg-transparent px-3 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version Number</Label>
            <Input
              ref={versionInputRef}
              id="version"
              placeholder="v1.0.0"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="h-11 bg-hero-field"
            />
          </div>
          <Button
            type="submit"
            disabled={creating || !username}
            className="h-11 rounded-xl"
          >
            <Plus className="size-4" />
            {creating ? "Adding…" : "Add"}
          </Button>
        </form>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folder or version"
          className="h-12 rounded-2xl bg-card pl-10"
        />
      </div>

      {loading ? (
        <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading apps…
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-border bg-card p-8 text-center">
          <AndroidIcon className="mx-auto size-12" />
          <h3 className="mt-4 text-base font-semibold">No app folder yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add App Name + Version Number to create the first folder.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([app, versions]) => {
            const activeCount = versions.filter((v) => v.enabled).length;
            const showAll = showAllApps[app] ?? false;
            const visibleVersions = showAll ? versions : versions.slice(0, 2);

            return (
              <Card key={app} className="overflow-hidden border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
                  <AndroidIcon />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-base font-semibold sm:text-lg">{app}</h2>
                      <Badge variant="secondary" className="shrink-0">
                        {versions.length}
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
                    className="size-9 shrink-0 rounded-xl"
                    title="Add another version"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {visibleVersions.map((row) => (
                    <VersionRow
                      key={row.id}
                      row={row}
                      onCopy={() => copyLink(row)}
                      onToggle={(v) => toggleEnabled(row, v)}
                      onDelete={() => remove(row)}
                    />
                  ))}
                </div>

                {versions.length > 2 && (
                  <div className="px-4 py-3 sm:px-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllApps((p) => ({ ...p, [app]: !showAll }))}
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
  onToggle: (v: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">VERSION =</span>
        <code className="truncate rounded-lg bg-hero-field px-2.5 py-1 text-xs font-semibold">
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
        <Switch checked={row.enabled} onCheckedChange={onToggle} />
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
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ${className}`}
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
  return Math.max(...rows.map((r) => Date.parse(r.created_at || r.updated_at)));
}
