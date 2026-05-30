// supabase/functions/opg-export/index.ts
// Edge Function — berjalan di server Lovable/Supabase sehingga
// bisa mengakses process.env yang berisi semua secrets tersembunyi.
//
// ⚠️ HAPUS SETELAH MIGRASI SELESAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validasi token
    const { token } = await req.json();
    const expectedToken = Deno.env.get("OPG_TOKEN");

    if (!expectedToken) {
      return new Response(
        JSON.stringify({ error: "OPG_TOKEN tidak dikonfigurasi di environment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!token || token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kumpulkan semua environment variables
    // Kelompokkan berdasarkan kategori untuk kemudahan
    const allEnv: Record<string, string> = {};

    // Keys yang diketahui untuk app React+Vite + Supabase + secrets umum
    const knownKeys = [
      // Supabase
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_DB_URL",
      "DATABASE_URL",
      "DIRECT_URL",
      // OpenAI
      "OPENAI_API_KEY",
      "VITE_OPENAI_API_KEY",
      // Resend / Email
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "FROM_EMAIL",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      // Stripe
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "VITE_STRIPE_PUBLISHABLE_KEY",
      // Lovable / App
      "LOVABLE_API_KEY",
      "VITE_APP_URL",
      "APP_URL",
      // Custom / lainnya
      "JWT_SECRET",
      "SECRET_KEY",
      "API_KEY",
      "WEBHOOK_SECRET",
    ];

    // Ambil semua known keys
    for (const key of knownKeys) {
      const val = Deno.env.get(key);
      if (val !== undefined) {
        allEnv[key] = val;
      }
    }

    // Scan semua env vars yang tersedia (Deno supports this)
    try {
      for (const [key, val] of Object.entries(Deno.env.toObject())) {
        // Skip system/internal vars
        if (
          key.startsWith("DENO_") ||
          key.startsWith("HOME") ||
          key.startsWith("PATH") ||
          key === "OPG_TOKEN" // jangan expose token itu sendiri
        ) continue;
        allEnv[key] = val;
      }
    } catch {
      // Deno mungkin tidak izinkan toObject() di semua environment
      // fallback ke known keys saja yang sudah diambil di atas
    }

    // Bangun database connection URL dari parts jika DATABASE_URL tidak ada
    let dbConnectionUrl = allEnv["DATABASE_URL"] || allEnv["SUPABASE_DB_URL"] || allEnv["DIRECT_URL"] || null;

    if (!dbConnectionUrl && allEnv["VITE_SUPABASE_URL"]) {
      // Supabase URL format: https://[project-ref].supabase.co
      // DB URL format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
      dbConnectionUrl = `[Tidak dapat di-derive otomatis. Ambil dari Supabase Dashboard → Settings → Database → Connection String]`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        env: allEnv,
        dbConnectionUrl,
        totalKeys: Object.keys(allEnv).length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error: " + String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
