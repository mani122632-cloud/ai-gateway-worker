// errors.js — AI Gateway Worker (Phase 3 skeleton)
// PURPOSE: central place for internal error codes returned to the CRM app.
// The app never sees raw upstream (Gemini) error details — only one of
// the standardized codes below, always wrapped by responseFormat.js.
//
// No secrets, no API keys, no environment access in this file.

// Internal error codes used across the Worker. Keep this list in sync
// with whatever ai-gateway.js (in the CRM app, untouched by this file)
// expects to receive.
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',       // missing/invalid X-App-Token
  INVALID_REQUEST: 'INVALID_REQUEST', // malformed or disallowed request body
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NOT_FOUND: 'NOT_FOUND',             // any route other than POST /ai/invoke
  RATE_LIMIT: 'RATE_LIMIT',           // upstream 429 from Gemini
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',   // any other non-2xx from Gemini
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',   // Gemini responded but no usable text
  INTERNAL_ERROR: 'INTERNAL_ERROR',   // unexpected exception inside the Worker
};

// Maps a Gemini HTTP status code to one of the internal codes above.
// status: number — the HTTP status returned by the Gemini API call.
export function mapUpstreamStatus(status) {
  if (status === 429) return ErrorCodes.RATE_LIMIT;
  if (status >= 500) return ErrorCodes.UPSTREAM_ERROR;
  if (status >= 400) return ErrorCodes.UPSTREAM_ERROR;
  return ErrorCodes.INTERNAL_ERROR;
}
