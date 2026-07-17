import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isMetaSellerLead, runSellerLeadAutomation } from "../_shared/sellerLeadAutomation.ts";

/**
 * Inbound lead capture for forms, landing pages, or Zapier/Make.
 * Deploy with verify_jwt=false. Auth via INBOUND_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const webhookSecret = Deno.env.get("INBOUND_WEBHOOK_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (webhookSecret && token === webhookSecret) return true;
  if (serviceRole && token === serviceRole) return true;
  return false;
}

function splitName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "Lead", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

function isPortalBuyerSource(source: string): boolean {
  return /(realestate\.com\.au|realestate|rea|domain\.com\.au|domain)/i.test(source);
}

function parseBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}

function hasSellerLeadSignal(body: Record<string, unknown>): boolean {
  const explicitFlagKeys = ["has_seller_lead", "seller_lead_attached", "is_seller_lead", "seller_intent"] as const;
  for (const key of explicitFlagKeys) {
    if (parseBooleanLike(body[key])) return true;
  }
  const leadType = typeof body.lead_type === "string" ? body.lead_type.trim().toLowerCase() : "";
  if (leadType === "seller" || leadType === "seller_lead") return true;
  const sellerIntentText = [body.seller_context, body.selling_intentions, body.notes, body.property_interest]
    .filter((v): v is string => typeof v === "string").join(" ").toLowerCase();
  return /\b(seller|selling|sell|appraisal|list(?:ing)?\s+my\s+property)\b/i.test(sellerIntentText);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const ownerUserId = typeof body.owner_user_id === "string" ? body.owner_user_id.trim() : "";
  if (!ownerUserId || !UUID_RE.test(ownerUserId)) {
    return new Response(JSON.stringify({ error: "owner_user_id must be a valid UUID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const firstRaw = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const lastRaw = typeof body.last_name === "string" ? body.last_name.trim() : "";
  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  let displayName: string; let firstName: string; let lastName: string;
  if (nameRaw) {
    const s = splitName(nameRaw);
    firstName = firstRaw || s.first; lastName = lastRaw || s.last; displayName = nameRaw;
  } else if (firstRaw || lastRaw) {
    firstName = firstRaw || "Lead"; lastName = lastRaw; displayName = `${firstName} ${lastName}`.trim();
  } else {
    return new Response(JSON.stringify({ error: "Provide name or first_name / last_name" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const email = typeof body.email === "string" ? body.email.trim() || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "inbound_webhook";
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const propertyInterest = typeof body.property_interest === "string" ? body.property_interest.trim() || null : null;
  const timeline = typeof body.timeline === "string" ? body.timeline.trim() || null : null;
  const budgetMin = typeof body.budget_min === "number" ? body.budget_min : typeof body.budget_min === "string" ? Number(body.budget_min) : null;
  const budgetMax = typeof body.budget_max === "number" ? body.budget_max : typeof body.budget_max === "string" ? Number(body.budget_max) : null;
  const createContact = body.create_contact === false ? false : true;
  const sellerLead = hasSellerLeadSignal(body);
  const contactCategory = sellerLead ? "seller_lead" : isPortalBuyerSource(source) ? "active_buyer" : "warm_lead";
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: leadRow, error: leadErr } = await supabase.from("leads").insert({
    user_id: ownerUserId, name: displayName, email, phone, source, notes,
    property_interest: propertyInterest,
    budget_min: budgetMin != null && Number.isFinite(budgetMin) ? budgetMin : null,
    budget_max: budgetMax != null && Number.isFinite(budgetMax) ? budgetMax : null,
    timeline, status: "new",
  }).select("id").single();
  if (leadErr) {
    console.error("[inbound-lead] leads insert:", leadErr);
    return new Response(JSON.stringify({ error: leadErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let contactId: string | null = null;
  if (createContact) {
    const { data: cRow, error: cErr } = await supabase.from("contacts").insert({
      user_id: ownerUserId, owner_id: ownerUserId, first_name: firstName, last_name: lastName || null,
      name: displayName, email, phone, source, notes, contact_category: contactCategory,
      property_requirements: propertyInterest ? { summary: propertyInterest } : null,
      buying_budget_min: budgetMin != null && Number.isFinite(budgetMin) ? budgetMin : null,
      buying_budget_max: budgetMax != null && Number.isFinite(budgetMax) ? budgetMax : null,
      selling_intentions: sellerLead && propertyInterest ? `Seller context from enquiry: ${propertyInterest}` : null,
    }).select("id").single();
    if (cErr) {
      console.error("[inbound-lead] contacts insert:", cErr);
      return new Response(JSON.stringify({ ok: true, lead_id: leadRow.id, contact_id: null, warning: `Lead created but contact failed: ${cErr.message}` }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    contactId = cRow?.id ?? null;
    if (contactId) {
      const { error: linkErr } = await supabase.from("leads").update({ contact_id: contactId }).eq("id", leadRow.id);
      if (linkErr) console.error("[inbound-lead] lead contact_id link:", linkErr);
    }
    if (contactId && isMetaSellerLead(source, contactCategory)) {
      try {
        const automation = await runSellerLeadAutomation(supabase, { ownerUserId, contactId, firstName, lastName, phone, email, address: propertyInterest, timeline, source });
        console.log("[inbound-lead] seller-lead automation:", JSON.stringify(automation));
      } catch (autoErr) {
        console.error("[inbound-lead] seller-lead automation failed:", autoErr);
      }
    }
  }
  return new Response(JSON.stringify({ ok: true, lead_id: leadRow.id, contact_id: contactId }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
