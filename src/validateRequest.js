// validateRequest.js — AI Gateway Worker (Phase 3 skeleton)
// PURPOSE: validates every incoming request before it is allowed to
// reach geminiClient.js. Checks HTTP method, the app-to-gateway auth
// token, content type, and the shape of the JSON body.
//
// No secrets are stored here — APP_SHARED_TOKEN is read from `env`
// (Worker Secret bindings) at call time, never hardcoded.
import { ErrorCodes } from './errors.js';

// Keep this list in sync with the operations AIService (CRM app,
// untouched by this project) is allowed to request.
const ALLOWED_OPERATIONS = [
  'customerSummary',
  'communicationHistorySummary',
  'nextActionSuggestion',
  'followUpDraft',
  'leadDealAnalysis',
  'churnDetection',
  'salesTrendAnalysis',
];

const MAX_PROMPT_LENGTH = 8000; // characters — guards against runaway cost/abuse

// Constant-time string comparison to avoid leaking token length/content
// via response-time side channels.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Validates the HTTP method. Only POST is allowed for /ai/invoke.
export function validateMethod(request) {
  if (request.method !== 'POST') {
    return { valid: false, errorCode: ErrorCodes.METHOD_NOT_ALLOWED, status: 405 };
  }
  return { valid: true };
}

// Validates the X-App-Token header against the Worker Secret.
// env.APP_SHARED_TOKEN must be set via `wrangler secret put APP_SHARED_TOKEN`
// (placeholder only in this repo — see wrangler.toml comments).
export function validateAuth(request, env) {
  const token = (request.headers.get('X-App-Token') || '').trim();
  const expected = ((env && env.APP_SHARED_TOKEN) || '').trim();
  if (!expected || !timingSafeEqual(token, expected)) {
    return { valid: false, errorCode: ErrorCodes.UNAUTHORIZED, status: 401 };
  }
  return { valid: true };
}

// Validates Content-Type and parses/validates the JSON body shape.
// Returns { valid: true, body: { operation, prompt } } on success, or
// { valid: false, errorCode, status } on failure.
export async function validateBody(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.indexOf('application/json') === -1) {
    return { valid: false, errorCode: ErrorCodes.INVALID_REQUEST, status: 400 };
  }

  let parsed;
  try {
    parsed = await request.json();
  } catch (e) {
    return { valid: false, errorCode: ErrorCodes.INVALID_REQUEST, status: 400 };
  }

  const operation = parsed && parsed.operation;
  const prompt = parsed && parsed.prompt;

  if (typeof operation !== 'string' || ALLOWED_OPERATIONS.indexOf(operation) === -1) {
    return { valid: false, errorCode: ErrorCodes.INVALID_REQUEST, status: 400 };
  }
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { valid: false, errorCode: ErrorCodes.INVALID_REQUEST, status: 400 };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, errorCode: ErrorCodes.INVALID_REQUEST, status: 400 };
  }

  return { valid: true, body: { operation: operation, prompt: prompt } };
}
