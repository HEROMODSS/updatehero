import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
          .select("credit,enabled,title,points,update_link,cancel_text,update_text")
          .eq("app_name", app)
          .eq("version", version)
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

        return new Response(
          JSON.stringify(
            {
              credit: row.credit ?? "Hero",
              enabled: !!row.enabled,
              title: row.title ?? "",
              points: Array.isArray(row.points) ? row.points : [],
              update_link: row.update_link ?? "",
              cancel_text: row.cancel_text ?? "NOT NOW",
              update_text: row.update_text ?? "UPDATE NOW",
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
