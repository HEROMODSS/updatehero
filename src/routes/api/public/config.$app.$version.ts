import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public endpoint matching what the dex calls. The dex should hit:
//   https://<your-domain>/api/public/config/<app>/<version>
// where <app> is e.g. context.getPackageName() (or any string you pick)
// and <version> is BuildConfig.VERSION_NAME.
//
// If no exact (app, version) row exists we fall back to (app, "default")
// so a single "default" config can cover unreleased versions.
export const Route = createFileRoute("/api/public/config/$app/$version")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const app = (params.app ?? "").trim();
        const version = (params.version ?? "").trim();
        if (!app || app.length > 200 || !version || version.length > 100) {
          return new Response("Invalid params", { status: 400 });
        }

        const cols =
          "credit,enabled,title,points,update_link,cancel_text,update_text";

        const exact = await supabaseAdmin
          .from("app_configs")
          .select(cols)
          .eq("app_name", app)
          .eq("version", version)
          .maybeSingle();

        let row = exact.data;
        if (!row) {
          const fallback = await supabaseAdmin
            .from("app_configs")
            .select(cols)
            .eq("app_name", app)
            .eq("version", "default")
            .maybeSingle();
          row = fallback.data;
        }

        if (!row) {
          return new Response("Not found", {
            status: 404,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        const body = {
          credit: row.credit ?? "",
          enabled: !!row.enabled,
          title: row.title ?? "",
          points: Array.isArray(row.points) ? row.points : [],
          update_link: row.update_link ?? "",
          cancel_text: row.cancel_text ?? "NOT NOW",
          update_text: row.update_text ?? "UPDATE NOW",
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=15",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
