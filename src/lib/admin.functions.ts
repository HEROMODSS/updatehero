import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ADMIN_EMAILS = [
  "official.heromods@gmail.com",
  "officialakmalmalik@gmail.com",
];

export function isAdminEmail(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertAdmin(claims: Record<string, unknown>) {
  if (!isAdminEmail(claims.email as string | undefined)) {
    throw new Error("Forbidden: admin only");
  }
}

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const admin = getAdminClient();
    const all: Array<{
      id: string;
      email: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      banned_until: string | null;
    }> = [];
    let page = 1;
    while (page <= 5) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        all.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
        });
      }
      if (data.users.length < 200) break;
      page++;
    }
    return { users: all, adminEmails: ADMIN_EMAILS };
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
