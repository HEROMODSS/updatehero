import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public endpoint matching what the dex calls:
//   https://<your-domain>/api/public/config/<app>/<version>
//
// Behavior:
// 1. Exact (app, version) row exists -> return it.
// 2. Otherwise, if (app, "default") exists -> auto-create a new row for this
//    (app, version) inheriting all fields from default (so the new version
//    auto-appears in the dashboard and can be toggled separately). Return
//    that newly-created row's JSON.
// 3. Otherwise -> 404.
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

        if (!row && version !== "default") {
          // Look up default to inherit values + owner.
          const def = await supabaseAdmin
            .from("app_configs")
            .select(
              "owner_id,credit,enabled,title,points,update_link,cancel_text,update_text",
            )
            .eq("app_name", app)
            .eq("version", "default")
            .maybeSingle();

          if (def.data) {
            // Auto-create the version row so it shows up in the dashboard.
            const created = await supabaseAdmin
              .from("app_configs")
              .insert({
                app_name: app,
                version,
                owner_id: def.data.owner_id,
                credit: def.data.credit,
                enabled: def.data.enabled,
                title: def.data.title,
                points: def.data.points ?? [],
                update_link: def.data.update_link,
                cancel_text: def.data.cancel_text,
                update_text: def.data.update_text,
              })
              .select(cols)
              .maybeSingle();
            row = created.data ?? {
              credit: def.data.credit,
              enabled: def.data.enabled,
              title: def.data.title,
              points: def.data.points,
              update_link: def.data.update_link,
              cancel_text: def.data.cancel_text,
              update_text: def.data.update_text,
            };
          }
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
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
