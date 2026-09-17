// responseFormat.js — AI Gateway Worker (Phase 3 skeleton)
// PURPOSE: the ONLY place that builds the HTTP Response objects the
// Worker sends back to the CRM app. Guarantees every response — success
// or failure — matches the fixed contract expected by ai-gateway.js:
//   success: { ok: true,  text: "..." }
//   failure: { ok: false, error: "CODE" }
//
// No secrets, no API keys in this file.

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-App-Token' };

// Builds a successful JSON response.
// text: string — the model output to return to the CRM app.
export function okResponse(text) {
  return new Response(JSON.stringify({ ok: true, text: text }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

// Builds an error JSON response.
// errorCode: string — one of the codes defined in errors.js.
// httpStatus: number — HTTP status to send (defaults to 400).
export function errorResponse(errorCode, httpStatus) {
  return new Response(JSON.stringify({ ok: false, error: errorCode }), {
    status: httpStatus || 400,
    headers: JSON_HEADERS,
  });
}
