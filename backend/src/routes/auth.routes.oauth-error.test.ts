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
