import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public endpoint that returns the UpdateDialog JSON exactly in the shape
// the dex expects. Hardcode this URL inside your app instead of a GitHub raw URL:
//   https://<your-domain>/api/public/config/<slug>
export const Route = createFileRoute("/api/public/config/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug;
        if (!slug || slug.length > 200) {
          return new Response("Invalid slug", { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("app_configs")
          .select("credit,enabled,title,points,update_link,cancel_text,update_text")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.error("config fetch error:", error);
          return new Response("Server error", { status: 500 });
        }
        if (!data) {
          return new Response("Not found", { status: 404 });
        }

        // Strip nulls / coerce shape
        const body = {
          credit: data.credit ?? "",
          enabled: !!data.enabled,
          title: data.title ?? "",
          points: Array.isArray(data.points) ? data.points : [],
          update_link: data.update_link ?? "",
          cancel_text: data.cancel_text ?? "NOT NOW",
          update_text: data.update_text ?? "UPDATE NOW",
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=30",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
