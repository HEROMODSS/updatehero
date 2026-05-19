import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase auto-handles recovery hash, just wait for session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // give the listener a moment to consume the hash
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
        });
        setTimeout(() => sub.subscription.unsubscribe(), 5000);
      }
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Signing you in…");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <Toaster />
      <div className="w-full max-w-md">
        <Card className="relative overflow-hidden border-primary/20 bg-hero-glass p-7 shadow-hero backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            <Sparkles className="mr-1 size-3" /> Reset password
          </Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Set a new password</h1>

          {!ready ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Open this page from the reset link in your email.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 bg-hero-field/70"
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl shadow-hero-sm"
                disabled={loading}
              >
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
