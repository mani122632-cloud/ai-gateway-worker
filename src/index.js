// index.js — AI Gateway Worker (Phase 3 skeleton)
// PURPOSE: single entry point for the Worker. Routes only
// `POST /ai/invoke`, and wires together validation, the Gemini client,
// and the fixed response format. This is the only Worker exposed to
// the CRM app's ai-gateway.js (in a future phase, not part of this file).
//
// No secrets are declared here. env.GEMINI_API_KEY and
// env.APP_SHARED_TOKEN are Worker Secrets configured outside the code
// (see wrangler.toml comments and README).
import { validateMethod, validateAuth, validateBody } from './validateRequest.js';
import { callGemini } from './geminiClient.js';
import { okResponse, errorResponse } from './responseFormat.js';
import { ErrorCodes } from './errors.js';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Only one route exists on this Worker: POST /ai/invoke.
    if (url.pathname !== '/ai/invoke') {
      return addCors(errorResponse(ErrorCodes.NOT_FOUND, 404), corsHeaders);
    }

    const methodCheck = validateMethod(request);
    if (!methodCheck.valid) {
      return errorResponse(methodCheck.errorCode, methodCheck.status);
    }

    const authCheck = validateAuth(request, env);
    if (!authCheck.valid) {
      return errorResponse(authCheck.errorCode, authCheck.status);
    }

    const bodyCheck = await validateBody(request);
    if (!bodyCheck.valid) {
      return errorResponse(bodyCheck.errorCode, bodyCheck.status);
    }

    try {
      const result = await callGemini(env, bodyCheck.body.prompt);
      if (!result.ok) {
        return errorResponse(result.errorCode, upstreamStatusFor(result.errorCode));
      }
      return addCors(okResponse(result.text), corsHeaders);
    } catch (err) {
      // Unexpected exception anywhere in the call chain — never leak
      // internals, always return the generic internal error code.
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }
  },
};

// Maps an internal error code to a reasonable HTTP status to send back.
function upstreamStatusFor(errorCode) {
  if (errorCode === ErrorCodes.RATE_LIMIT) return 429;
  if (errorCode === ErrorCodes.UPSTREAM_TIMEOUT) return 504;
  if (errorCode === ErrorCodes.EMPTY_RESPONSE) return 502;
  if (errorCode === ErrorCodes.UPSTREAM_ERROR) return 502;
  return 500;
}


function addCors(response, headers) {
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
