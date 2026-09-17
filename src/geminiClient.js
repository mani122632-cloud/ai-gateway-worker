// geminiClient.js — AI Gateway Worker (Phase 3 skeleton)
// PURPOSE: the ONLY module that talks to the Gemini API. Builds the
// request in Gemini's native format, calls it, and extracts the plain
// text result. The API key is read exclusively from `env.GEMINI_API_KEY`
// (a Worker Secret) — never hardcoded, never logged, never returned to
// the caller.
import { ErrorCodes, mapUpstreamStatus } from './errors.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 15000;

// Calls the Gemini generateContent endpoint with a single text prompt.
// env: Worker environment bindings — must provide GEMINI_API_KEY (secret)
//      and may provide GEMINI_MODEL (plain var, defaults to DEFAULT_MODEL).
// prompt: string — already built by the CRM app's ai-prompts.js.
//
// Returns one of:
//   { ok: true, text: string }
//   { ok: false, errorCode: string }
export async function callGemini(env, prompt) {
  const apiKey = env && env.GEMINI_API_KEY;
  if (!apiKey) {
    // Misconfiguration on the Worker side (secret not set yet) — never
    // exposes *why* to the caller, just a generic internal error.
    return { ok: false, errorCode: ErrorCodes.INTERNAL_ERROR };
  }

  const model = (env && env.GEMINI_MODEL) || DEFAULT_MODEL;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

  const requestBody = {
    contents: [
      { parts: [{ text: prompt }] },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err && err.name === 'AbortError') {
      return { ok: false, errorCode: ErrorCodes.UPSTREAM_TIMEOUT };
    }
    return { ok: false, errorCode: ErrorCodes.UPSTREAM_ERROR };
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.text();
    console.log('GEMINI_STATUS:', response.status);
    console.log('GEMINI_ERROR:', errorBody.slice(0, 1000));
    return { ok: false, errorCode: mapUpstreamStatus(response.status) };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return { ok: false, errorCode: ErrorCodes.UPSTREAM_ERROR };
  }

  const text = extractText(data);
  if (!text) {
    return { ok: false, errorCode: ErrorCodes.EMPTY_RESPONSE };
  }

  return { ok: true, text: text };
}

// Extracts the plain text from Gemini's candidates/parts response shape.
// Defensive against missing fields (safety-filtered responses, etc.).
function extractText(data) {
  try {
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    if (!parts || !parts.length) return '';
    return parts.map(function (p) { return p.text || ''; }).join('').trim();
  } catch (err) {
    return '';
  }
}
