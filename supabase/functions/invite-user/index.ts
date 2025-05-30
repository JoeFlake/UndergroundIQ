import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, role, company_id } = await req.json();
    if (!email || !role || !company_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("PROJECT_URL:", Deno.env.get("PROJECT_URL"));
    console.log("SERVICE_ROLE_KEY:", Deno.env.get("SERVICE_ROLE_KEY"));

    // USE THE NEW SECRET NAMES HERE:
    const supabase = createClient(
      Deno.env.get("PROJECT_URL")!, // <--- not SUPABASE_URL
      Deno.env.get("SERVICE_ROLE_KEY")! // <--- not SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!data || !data.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create auth user." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      email,
      role,
      company_id,
    });
    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to add user to database." }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ user: data.user }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected server error." }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
