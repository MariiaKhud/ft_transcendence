// 1. This test checks that OAuth login errors get the right error code — like when the redirect URL doesn't match, or the login code is invalid or expired
// 2. It runs sample error cases through getOAuthCallbackErrorCode (from auth.routes.ts) and checks the output is correct, so the error messages shown to users
//    stay correct if that logic changes later

import assert from 'node:assert/strict'
import { getOAuthCallbackErrorCode } from './auth.routes'

const cases = [
  {
    name: 'redirect URI mismatch from OAuth provider',
    input: {
      name: 'TokenError',
      message: 'Failed to fetch access token',
      oauthError: {
        data: {
          error: 'redirect_uri_mismatch',
          error_description: 'The redirect_uri does not match the registered callback URL',
        },
      },
    },
    expected: 'oauth_redirect_uri_mismatch',
  },
  {
    name: 'token exchange failure from malformed grant',
    input: {
      name: 'TokenError',
      message: 'Failed to obtain access token',
      oauthError: {
        data: {
          error: 'invalid_grant',
          error_description: 'The authorization code has been used or is invalid',
        },
      },
    },
    expected: 'oauth_access_token_failed',
  },
  {
    name: 'generic callback failure stays as callback invalid',
    input: {
      name: 'Error',
      message: 'Something unexpected happened',
    },
    expected: 'oauth_callback_invalid',
  },
]

for (const testCase of cases) {
  const actual = getOAuthCallbackErrorCode(testCase.input)
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected}, got ${actual}`)
}

console.log('OAuth callback error classification checks passed')
