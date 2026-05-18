import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_POINTS = [
  "🔥 Faster performance and smoother UI",
  "🔒 Improved security and privacy handling",
];

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

        const points = Array.isArray(row.points) && row.points.length > 0 ? row.points : DEFAULT_POINTS;

        return new Response(
          JSON.stringify(
            {
              credit: "HERO",
              enabled: !!row.enabled,
              title: row.title || "🚀 New Update is Live!",
              points,
              update_link: row.update_link || "https://t.me/heromodss",
              cancel_text: row.cancel_text || "NOT NOW",
              update_text: row.update_text || "UPDATE NOW",
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
