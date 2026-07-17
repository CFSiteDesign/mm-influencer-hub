import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Phase 2 A4: capture creator replies for the dashboard chat log.
//
// Resend receives mail for creatorhub.madmonkeyhostels.com (inbound MX) and
// POSTs an `email.received` event here. That event carries metadata only, so we
// call the Received Emails API to pull the body, match it to an applicant, and
// store it in inbound_emails.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Resend signs webhooks with Svix: base64 HMAC-SHA256 over `id.timestamp.body`.
async function verifySignature(secret: string, headers: Headers, rawBody: string): Promise<boolean> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject anything older than 5 minutes (replay protection).
  const age = Math.abs(Date.now() / 1000 - Number(svixTimestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${svixId}.${svixTimestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));

  // Header may carry several space-separated `v1,<sig>` values.
  return svixSignature.split(' ').some((part) => {
    const sig = part.split(',')[1];
    if (!sig || sig.length !== expected.length) return false;
    // Constant-time compare.
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

// Replies quote the whole previous email underneath. Keep only the new text.
function stripQuotedText(text: string): string {
  if (!text) return '';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cutMarkers = [
    /^\s*On .*wrote:\s*$/i,               // Gmail / Apple Mail
    /^\s*-{2,}\s*Original Message\s*-{2,}/i, // Outlook
    /^\s*_{5,}\s*$/,                       // Outlook divider
    /^\s*From:\s.+/i,                      // forwarded/quoted header block
    /^\s*Sent from my \w+/i,
  ];
  const out: string[] = [];
  for (const line of lines) {
    if (cutMarkers.some((re) => re.test(line))) break;
    if (/^\s*>/.test(line)) continue; // quoted line
    out.push(line);
  }
  return out.join('\n').trim();
}

function parseAddress(value: unknown): { email: string; name: string | null } {
  const raw = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
  const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (angled) return { email: angled[2].trim().toLowerCase(), name: angled[1].replace(/^"|"$/g, '').trim() || null };
  return { email: raw.trim().toLowerCase(), name: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');
  // Team inbox that should keep seeing every reply, exactly as today.
  const RELAY_TO = Deno.env.get('CREATOR_HUB_INBOX') || 'creatorhub@madmonkeyhostels.com';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const rawBody = await req.text();

    if (WEBHOOK_SECRET) {
      const valid = await verifySignature(WEBHOOK_SECRET, req.headers, rawBody);
      if (!valid) {
        console.warn('resend-inbound-webhook: signature verification failed');
        return json({ ok: false, error: 'Invalid signature' }, 401);
      }
    } else {
      console.warn('resend-inbound-webhook: RESEND_WEBHOOK_SECRET not set — accepting unverified payload');
    }

    const event = JSON.parse(rawBody);
    if (event?.type !== 'email.received') {
      return json({ ok: true, skipped: `ignored event type ${event?.type}` });
    }

    const data = event.data ?? {};
    const receivedId: string | undefined = data.email_id ?? data.id;
    if (!receivedId) return json({ ok: false, error: 'No email_id on event' });

    // The event is metadata only — fetch the full email for the body/headers.
    let full: any = {};
    if (RESEND_API_KEY) {
      const res = await fetch(`https://api.resend.com/emails/receiving/${receivedId}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      if (res.ok) full = await res.json();
      else console.error('Failed to fetch received email', res.status, await res.text());
    }

    const from = parseAddress(full.from ?? data.from);
    const to = parseAddress(full.to ?? data.to);
    const subject = full.subject ?? data.subject ?? null;
    const bodyText = stripQuotedText(full.text || '');
    const headers = full.headers ?? {};
    const inReplyTo = headers['in-reply-to'] ?? headers['In-Reply-To'] ?? null;
    const messageId = full.message_id ?? headers['message-id'] ?? null;

    // Match to a creator by sender address. Forwarded mail keeps the original
    // sender, so this holds up whether the reply comes direct or relayed.
    const { data: applicant } = await supabase
      .from('applicants')
      .select('id')
      .ilike('email', from.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!applicant) {
      console.warn(`resend-inbound-webhook: no applicant matches ${from.email} — storing unlinked`);
    }

    const { error } = await supabase.from('inbound_emails').upsert({
      applicant_id: applicant?.id ?? null,
      from_email: from.email,
      from_name: from.name,
      to_email: to.email,
      subject,
      body_text: bodyText,
      body_html: full.html ?? null,
      message_id: messageId,
      in_reply_to: inReplyTo,
      resend_email_id: receivedId,
      raw: { event: data, headers },
    }, { onConflict: 'resend_email_id' });

    if (error) {
      console.error('inbound_emails insert failed', error);
      return json({ ok: false, error: error.message });
    }

    // Keep the team inbox whole: relay a copy of every captured reply.
    if (RESEND_API_KEY && RELAY_TO) {
      const relay = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>',
          to: [RELAY_TO],
          reply_to: from.email,
          subject: `[Creator reply] ${subject ?? '(no subject)'}`,
          html: `<p style="color:#6b7280;font-size:13px;margin:0 0 12px;">
                   Reply from <strong>${from.name ?? ''} &lt;${from.email}&gt;</strong>${applicant ? '' : ' — no matching creator found in the hub'}
                 </p>
                 ${full.html || `<pre style="white-space:pre-wrap;font-family:inherit;">${bodyText}</pre>`}`,
        }),
      });
      if (!relay.ok) console.error('relay to team inbox failed', relay.status, await relay.text());
    }

    return json({ ok: true, matched: Boolean(applicant) });
  } catch (error) {
    console.error('resend-inbound-webhook error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
