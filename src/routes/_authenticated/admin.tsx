import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listAllUsers, setUserBlocked, isAdminEmail } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Search, ShieldCheck, Users } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const fetchUsers = useServerFn(listAllUsers);
  const setBlocked = useServerFn(setUserBlocked);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const isAdmin = isAdminEmail(data.user?.email);
      setAllowed(!!isAdmin);
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchUsers();
        setUsers(res.users as AdminUser[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUsers]);

  if (allowed === false) {
    return (
      <Card className="border-primary/15 bg-hero-glass p-8 text-center shadow-hero backdrop-blur-xl">
        <h2 className="text-lg font-semibold">Admin only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is restricted to the UpdateHero admin account.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary">
          Back to dashboard
        </Link>
      </Card>
    );
  }

  async function toggleBlock(user: AdminUser, block: boolean) {
    const prev = user.banned_until;
    setUsers((u) =>
      u.map((x) =>
        x.id === user.id
          ? { ...x, banned_until: block ? new Date(Date.now() + 1e12).toISOString() : null }
          : x,
      ),
    );
    try {
      await setBlocked({ data: { userId: user.id, blocked: block } });
      toast.success(block ? "User blocked" : "User unblocked");
    } catch (e) {
      setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, banned_until: prev } : x)));
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? users.filter((u) => (u.email ?? "").toLowerCase().includes(needle))
    : users;

  const blockedCount = users.filter((u) => isBlocked(u.banned_until)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-in fade-in-50 duration-500">
      <Toaster />
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <Card className="relative overflow-hidden border-primary/20 bg-hero-glass p-5 shadow-hero backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
              <ShieldCheck className="mr-1 size-3" /> Admin panel
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Registered users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {users.length} total · {blockedCount} blocked
            </p>
          </div>
          <Users className="size-10 text-primary" />
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email"
          className="h-12 rounded-2xl bg-hero-glass pl-10 shadow-hero-sm backdrop-blur-xl"
        />
      </div>

      {loading ? (
        <Card className="border-primary/15 bg-hero-glass p-8 text-center text-sm text-muted-foreground shadow-hero backdrop-blur-xl">
          Loading users…
        </Card>
      ) : (
        <Card className="divide-y divide-primary/10 overflow-hidden border-primary/15 bg-hero-glass shadow-hero backdrop-blur-xl">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No users.</div>
          ) : (
            filtered.map((u) => {
              const blocked = isBlocked(u.banned_until);
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.email ?? "(no email)"}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(u.created_at)}
                      {u.last_sign_in_at ? ` · Last in ${formatDate(u.last_sign_in_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={
                        blocked
                          ? "bg-destructive/20 text-destructive"
                          : "bg-primary/15 text-primary"
                      }
                    >
                      {blocked ? "Blocked" : "Active"}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{blocked ? "Allow" : "Block"}</span>
                      <Switch
                        checked={blocked}
                        onCheckedChange={(v) => toggleBlock(u, v)}
                        aria-label={`Block ${u.email}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}

function isBlocked(banned_until: string | null) {
  if (!banned_until) return false;
  const t = Date.parse(banned_until);
  return Number.isFinite(t) && t > Date.now();
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
