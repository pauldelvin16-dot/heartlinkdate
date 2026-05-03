// Shared SMTP send helper using nodemailer via npm:
import nodemailer from "npm:nodemailer@6.9.14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function getSiteAndSmtp() {
  const sb = admin();
  const [{ data: site }, { data: smtp }] = await Promise.all([
    sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("smtp_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!smtp || !smtp.host || !smtp.is_active) {
    throw new Error("SMTP not configured. Ask the admin to set it up in /admin.");
  }
  return { site, smtp };
}

export function renderTemplate(html: string, vars: Record<string, string>) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export async function sendMail(opts: {
  to: string;
  templateKey: string;
  vars: Record<string, string>;
  fallbackSubject?: string;
  fallbackHtml?: string;
}) {
  const { site, smtp } = await getSiteAndSmtp();
  const sb = admin();
  const { data: tpl } = await sb.from("email_templates").select("*").eq("key", opts.templateKey).eq("is_active", true).maybeSingle();
  const baseVars = {
    site_name: site?.site_name ?? "HeartLink",
    site_url: opts.vars.site_url ?? "",
    ...opts.vars,
  };
  const subject = renderTemplate(tpl?.subject ?? opts.fallbackSubject ?? `${baseVars.site_name}`, baseVars);
  const html = renderTemplate(tpl?.html ?? opts.fallbackHtml ?? "<p>Hello</p>", baseVars);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: !!smtp.secure, // true for 465, false for 587 (uses STARTTLS)
    auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    requireTLS: !smtp.secure,
  });

  const fromName = smtp.from_name || site?.site_name || "HeartLink";
  const fromEmail = smtp.from_email || smtp.username;
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: opts.to,
    replyTo: smtp.reply_to || undefined,
    subject,
    html,
  });
  return info;
}

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function originFromReq(req: Request): string {
  const o = req.headers.get("origin");
  if (o) return o;
  const ref = req.headers.get("referer");
  if (ref) try { return new URL(ref).origin; } catch {}
  return "";
}
