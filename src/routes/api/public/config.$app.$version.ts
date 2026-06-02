import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_POINTS = [
  "🔥 Faster performance and smoother UI",
  "🔒 Improved security and privacy handling",
];

// Set a value at a dotted path, e.g. "update.enabled" -> obj.update.enabled
function setAtPath(target: unknown, path: string, value: unknown): unknown {
  const keys = path.split(".").filter(Boolean);
  if (keys.length === 0) return target;
  const root: Record<string, unknown> =
    target && typeof target === "object" ? { ...(target as Record<string, unknown>) } : {};
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = cursor[key];
    cursor[key] =
      next && typeof next === "object" ? { ...(next as Record<string, unknown>) } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return root;
}

export const Route = createFileRoute("/api/public/config/$app/$version")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const app = (params.app ?? "").trim();
        const version = (params.version ?? "").trim();
        if (
          !app ||
          app.length > 200 ||
          !version ||
          version.length > 100 ||
          !/^[A-Za-z0-9._-]+$/.test(app) ||
          !/^[A-Za-z0-9._-]+$/.test(version)
        ) {
          return new Response("Invalid params", {
            status: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        const { data: row, error } = await supabaseAdmin
          .from("app_configs")
          .select(
            "credit,enabled,title,points,update_link,cancel_text,update_text,raw_json,enabled_key",
          )
          .ilike("app_name", app)
          .ilike("version", version)
          .maybeSingle();

        if (error) {
          return new Response("Config error", {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        if (!row) {
          return new Response("Not found", {
            status: 404,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        let payload: unknown;
        if (row.raw_json && typeof row.raw_json === "object") {
          // User-provided custom JSON. Inject the toggle at their chosen key.
          const key = (row.enabled_key && row.enabled_key.trim()) || "enabled";
          payload = setAtPath(row.raw_json, key, !!row.enabled);
        } else {
          const points =
            Array.isArray(row.points) && row.points.length > 0 ? row.points : DEFAULT_POINTS;
          payload = {
            credit: "HERO",
            enabled: !!row.enabled,
            title: row.title || "🚀 New Update is Live!",
            points,
            update_link: row.update_link || "https://t.me/heromodss",
            cancel_text: row.cancel_text || "NOT NOW",
            update_text: row.update_text || "UPDATE NOW",
          };
        }

        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
