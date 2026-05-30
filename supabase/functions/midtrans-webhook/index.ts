// Midtrans Payment Notification Webhook
// Receives HTTP notifications from Midtrans, verifies the signature,
// and records successful payments into the `kas` table (masuk / bank).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;

// SHA-512 hex digest
async function sha512Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!MIDTRANS_SERVER_KEY) {
      console.error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
    } = body ?? {};

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return new Response(JSON.stringify({ error: "Payload tidak lengkap" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature: SHA512(order_id + status_code + gross_amount + ServerKey)
    const expected = await sha512Hex(
      `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`
    );
    if (expected !== signature_key) {
      console.warn("Signature tidak valid untuk order:", order_id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if payment is successful
    const isSuccess =
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (isSuccess) {
      const tag = `[midtrans:${order_id}]`;

      // Idempotency: skip if already recorded
      const { data: existing } = await supabase
        .from("kas")
        .select("id")
        .ilike("keterangan", `%${tag}%`)
        .maybeSingle();

      if (!existing) {
        const amount = Math.round(Number(gross_amount));
        const { error: insertError } = await supabase.from("kas").insert({
          jenis: "masuk",
          metode: "bank",
          jumlah: amount,
          kategori: "pembayaran_online",
          keterangan: `Pembayaran Midtrans (${payment_type ?? "online"}) ${tag}`,
          tahun: new Date().getFullYear(),
        });

        if (insertError) {
          console.error("Gagal insert kas:", insertError);
          return new Response(JSON.stringify({ error: "DB insert failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log("Pembayaran tercatat untuk order:", order_id, amount);
      } else {
        console.log("Order sudah tercatat, dilewati:", order_id);
      }
    } else {
      console.log(
        "Status pembayaran tidak final/sukses:",
        order_id,
        transaction_status
      );
    }

    // Always return 200 so Midtrans stops retrying once handled
    return new Response(
      JSON.stringify({ received: true, order_id, transaction_status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
