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

function stripUser(name: string, username: string | null | undefined) {
  if (!username) return name;
  const p = `${username}-`;
  return name.toLowerCase().startsWith(p.toLowerCase()) ? name.slice(p.length) : name;
}

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
    const { data: userRes } = await supabase.auth.getUser();
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

  // Group by *display* (stripped) name so old un-prefixed rows merge with
  // newly-prefixed ones.
  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) =>
          [stripUser(row.app_name, username), row.version, row.title].some((v) =>
            v.toLowerCase().includes(needle),
          ),
        )
      : rows;
    const map = new Map<string, ConfigRow[]>();
    for (const row of filtered) {
      const key = stripUser(row.app_name, username);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .map(([app, versions]) => [app, versions.sort(sortNewestFirst)] as const)
      .sort((a, b) => newestTimestamp(b[1]) - newestTimestamp(a[1]));
  }, [query, rows, username]);

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

    // Stored name always carries the username prefix for unique URLs.
    const prefixedApp = `${username}-${stripUser(rawApp, username)}`;

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
          ? `"${stripUser(prefixedApp, username)} / ${version}" already exists.`
          : error.message,
      );
      return;
    }

    if (inserted) {
      setRows((current) => [inserted as ConfigRow, ...current].sort(sortNewestFirst));
    }
    setNewApp("");
    setNewVersion("");
    setShowAllApps((prev) => ({ ...prev, [stripUser(prefixedApp, username)]: true }));
    toast.success(`Added ${stripUser(prefixedApp, username)} / ${version}`);
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
    if (!confirm(`Delete ${stripUser(row.app_name, username)} / ${row.version}?`)) return;
    const { error } = await supabase.from("app_configs").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((c) => c.filter((i) => i.id !== row.id));
    toast.success("Deleted");
  }

  function addAnotherVersion(displayApp: string) {
    setNewApp(displayApp);
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

  const totalLive = rows.filter((r) => r.enabled).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in-50 duration-300">
      <Toaster />

      {/* Stats card */}
      <section
        className="relative overflow-hidden rounded-2xl p-[1px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,229,190,0.3), rgba(255,255,255,0.04) 55%, rgba(0,229,190,0.18))",
        }}
      >
        <div className="relative overflow-hidden rounded-[15px] bg-card px-5 py-5 sm:px-7 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(0,229,190,0.35), transparent)",
            }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Live console
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Update <span className="text-gradient-cyan">control</span>
              </h1>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Manage every app version. Toggle live, copy config, ship updates.
              </p>
            </div>
            <div className="flex gap-2.5">
              <StatChip label="Versions" value={rows.length} />
              <StatChip label="Live" value={totalLive} accent />
            </div>
          </div>
        </div>
      </section>

      {!loading && !username && (
        <Card className="border-primary/40 bg-card p-4 text-sm">
          You need a <span className="text-primary font-medium">username</span> in{" "}
          <Link to="/settings" className="text-primary underline">
            Settings
          </Link>{" "}
          before adding apps — it keeps your config links unique behind the scenes.
        </Card>
      )}

      {/* Add form */}
      <Card className="rounded-2xl border-border bg-card p-5">
        <form onSubmit={createConfig} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="app" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              App Name
            </Label>
            <Input
              id="app"
              placeholder="Vanced"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="h-11 rounded-[10px] border-border bg-surface-2 px-3.5 transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Version Number
            </Label>
            <Input
              ref={versionInputRef}
              id="version"
              placeholder="v1.0.0"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="h-11 rounded-[10px] border-border bg-surface-2 px-3.5 font-mono text-[13px] text-primary/90 placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <Button
            type="submit"
            disabled={creating || !username}
            className="sm:col-span-2 h-11 w-full rounded-[10px] font-semibold tracking-tight text-[#061018] hover:opacity-95"
            style={{
              background: "linear-gradient(135deg,#00e5be 0%,#27f5cf 100%)",
              boxShadow: "0 4px 20px rgba(0,229,190,0.25)",
            }}
          >
            <Plus className="size-4" />
            {creating ? "Adding…" : "Add Version"}
          </Button>
        </form>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search app or version"
          className="h-11 rounded-[10px] border-border bg-card pl-10 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      {loading ? (
        <Card className="rounded-2xl border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading apps…
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card p-12 text-center">
          <AndroidIcon className="mx-auto size-14" />
          <h3 className="mt-4 font-display text-base font-semibold">No apps yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an App Name + Version Number to create the first one.
          </p>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {grouped.map(([app, versions]) => {
            const activeCount = versions.filter((v) => v.enabled).length;
            const showAll = showAllApps[app] ?? false;
            const visibleVersions = showAll ? versions : versions.slice(0, 2);

            return (
              <Card
                key={app}
                className="overflow-hidden rounded-2xl border-border bg-card transition hover:border-primary/25"
              >
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <AndroidIcon />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
                      {app}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {versions.length} version{versions.length === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          activeCount
                            ? "border border-primary/35 bg-primary/10 text-primary"
                            : "border border-border bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {activeCount > 0 && (
                          <span className="size-1.5 rounded-full bg-primary" />
                        )}
                        {activeCount} live
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addAnotherVersion(app)}
                    className="size-9 shrink-0 rounded-[10px] border-border bg-surface-2 hover:border-primary/40 hover:text-primary"
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
                  <div className="border-t border-border px-5 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllApps((p) => ({ ...p, [app]: !showAll }))}
                      className="rounded-[10px] text-muted-foreground hover:text-primary"
                    >
                      <ChevronDown
                        className={`size-4 transition ${showAll ? "rotate-180" : ""}`}
                      />
                      {showAll ? "Show less" : `Show all ${versions.length} versions`}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Made with <span className="text-primary">♥</span> by Hero
      </p>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`min-w-[88px] rounded-xl border px-4 py-2.5 text-center ${
        accent
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-surface-2"
      }`}
    >
      <p
        className={`font-mono text-2xl font-bold leading-none ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function UpdateToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "on" : "off"}
      onClick={() => onChange(!checked)}
      className="uh-toggle"
      title={checked ? "Live — click to disable" : "Off — click to enable"}
    >
      <span className="uh-toggle__thumb" />
    </button>
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
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="flex flex-col items-center gap-1">
        <UpdateToggle checked={row.enabled} onChange={onToggle} />
        <span
          className={`text-[9px] font-semibold uppercase tracking-[0.16em] ${
            row.enabled ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {row.enabled ? "Live" : "Off"}
        </span>
      </div>

      <code className="min-w-0 flex-1 truncate rounded-[10px] border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] font-medium text-primary/90">
        {row.version}
      </code>

      <div className="flex items-center gap-1">
        <IconButton onClick={onCopy} title="Copy config link">
          <Copy className="size-4" />
        </IconButton>
        <Link to="/configs/$id" params={{ id: row.id }}>
          <IconButton title="Edit">
            <Edit3 className="size-4" />
          </IconButton>
        </Link>
        <IconButton onClick={onDelete} title="Delete" danger>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface-2 transition hover:border-primary/40 ${
        danger
          ? "text-muted-foreground hover:!border-destructive/50 hover:text-destructive"
          : "text-muted-foreground hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary ${className}`}
      style={{ boxShadow: "inset 0 0 12px rgba(0,229,190,0.08)" }}
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
