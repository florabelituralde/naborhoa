// Replacements for the Base44 "Core" integrations, implemented with public APIs:
//   InvokeLLM                    -> OpenAI Chat Completions
//   SendEmail                    -> Resend
//   ExtractDataFromUploadedFile  -> OpenAI (best-effort text extraction)
//
// Configure via env / `supabase secrets set`:
//   OPENAI_API_KEY, OPENAI_MODEL (default gpt-4o-mini)
//   RESEND_API_KEY, RESEND_FROM  (verified sender, e.g. "Nabor <no-reply@yourdomain>")

type AnyRecord = Record<string, any>;

function openAIKey(): string {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  return key;
}

function openAIModel(): string {
  return Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
}

// Base44's InvokeLLM returned a plain string (or a parsed object when a JSON
// schema was requested). We keep that contract.
export async function invokeLLM(payload: AnyRecord) {
  const { prompt, file_urls, response_json_schema } = payload || {};

  const content: any[] = [{ type: 'text', text: prompt || '' }];
  // Attach image files as vision inputs. Non-image files (PDF/HTML/TXT) are not
  // reliably readable this way; callers that need document text already inline
  // it into the prompt themselves.
  for (const url of file_urls || []) {
    if (typeof url === 'string' && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) {
      content.push({ type: 'image_url', image_url: { url } });
    }
  }

  const body: AnyRecord = {
    model: openAIModel(),
    messages: [{ role: 'user', content }],
  };
  if (response_json_schema) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAIKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  if (response_json_schema) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

export async function sendEmail(payload: AnyRecord) {
  const { to, subject, body, from_name } = payload || {};
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev';
  const from = from_name ? `${from_name} <${fromEmail}>` : fromEmail;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject: subject || '',
      text: body || '',
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// Base44's ExtractDataFromUploadedFile returned { output }. This is a
// best-effort port (no current caller in the app) using text extraction.
export async function extractData(payload: AnyRecord) {
  const { file_url, json_schema } = payload || {};
  let fileText = '';
  try {
    const r = await fetch(file_url);
    fileText = await r.text();
  } catch {
    /* ignore fetch failures; model gets an empty document */
  }
  const prompt =
    `Extract data from the following file content and return JSON that matches this schema:\n` +
    `${JSON.stringify(json_schema)}\n\nFile content:\n${fileText.slice(0, 100000)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAIKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: openAIModel(),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '{}';
  let output: any;
  try {
    output = JSON.parse(text);
  } catch {
    output = {};
  }
  return { output };
}
