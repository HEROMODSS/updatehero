import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your inbox for the reset link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <Toaster />
      <div className="w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to sign in
        </Link>
        <Card className="relative mt-4 overflow-hidden border-primary/20 bg-hero-glass p-7 shadow-hero backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px [background:var(--hero-sheen)]" />
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            <Sparkles className="mr-1 size-3" /> Forgot password
          </Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
          {sent ? (
            <p className="mt-6 rounded-xl border border-primary/15 bg-hero-glass-strong p-4 text-sm">
              Reset link sent to <strong>{email}</strong>. Check your inbox.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 bg-hero-field/70"
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl shadow-hero-sm"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
