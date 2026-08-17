// Stable, machine-readable error codes returned to API clients alongside the
// (English-only) `error` message. The frontend maps these to translated
// strings instead of displaying the raw English text — see
// frontend/src/lib/api-errors.ts and the `api.errors.*` translation keys.
export const ErrorCode = {
  // Generic
  INTERNAL_SERVER_ERROR: 'internal_server_error',
  ROUTE_NOT_FOUND: 'route_not_found',
  SERVER_MISCONFIGURED: 'server_misconfigured',

  // Auth / session
  AUTH_REQUIRED: 'auth_required',
  INVALID_TOKEN: 'invalid_token',
  INVALID_SESSION: 'invalid_session',
  FORBIDDEN_ROLE: 'forbidden_role',
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_TAKEN: 'email_already_taken',
  USERNAME_TAKEN: 'username_already_taken',
  EMAIL_OR_USERNAME_TAKEN: 'email_or_username_already_taken',
  CSRF_INVALID: 'csrf_invalid',

  // Validation — auth
  VALIDATION_EMAIL_REQUIRED: 'validation_email_required',
  VALIDATION_EMAIL_INVALID: 'validation_email_invalid',
  VALIDATION_USERNAME_REQUIRED: 'validation_username_required',
  VALIDATION_USERNAME_INVALID: 'validation_username_invalid',
  VALIDATION_PASSWORD_REQUIRED: 'validation_password_required',
  VALIDATION_PASSWORD_LENGTH: 'validation_password_length',
  VALIDATION_REGISTER_FIELDS_REQUIRED: 'validation_register_fields_required',
  VALIDATION_LOGIN_FIELDS_REQUIRED: 'validation_login_fields_required',

  // Validation — articles
  VALIDATION_TITLE_REQUIRED: 'validation_title_required',
  VALIDATION_TITLE_INVALID: 'validation_title_invalid',
  VALIDATION_TITLE_MAX_LENGTH: 'validation_title_max_length',
  VALIDATION_CONTENT_REQUIRED: 'validation_content_required',
  VALIDATION_CONTENT_INVALID: 'validation_content_invalid',
  VALIDATION_CONTENT_MIN_LENGTH: 'validation_content_min_length',
  VALIDATION_CATEGORY_REQUIRED: 'validation_category_required',
  VALIDATION_CATEGORY_INVALID: 'validation_category_invalid',
  VALIDATION_ARTICLE_FIELDS_REQUIRED: 'validation_article_fields_required',
  VALIDATION_ARTICLE_UPDATE_FIELDS_REQUIRED: 'validation_article_update_fields_required',
  VALIDATION_SORT_INVALID: 'validation_sort_invalid',
  VALIDATION_DATE_INVALID: 'validation_date_invalid',

  // Validation — comments
  VALIDATION_COMMENT_CONTENT_REQUIRED: 'validation_comment_content_required',
  VALIDATION_COMMENT_CONTENT_MAX_LENGTH: 'validation_comment_content_max_length',
  VALIDATION_REMOVE_REASON_REQUIRED: 'validation_remove_reason_required',
  VALIDATION_REMOVE_REASON_MAX_LENGTH: 'validation_remove_reason_max_length',

  // Validation — users/profile
  VALIDATION_USERNAME_FORMAT: 'validation_username_format',
  VALIDATION_SEARCH_QUERY_INVALID: 'validation_search_query_invalid',
  VALIDATION_SEARCH_QUERY_MAX_LENGTH: 'validation_search_query_max_length',
  VALIDATION_PROFILE_FIELDS_REQUIRED: 'validation_profile_fields_required',
  VALIDATION_PROFILE_UNKNOWN_FIELDS: 'validation_profile_unknown_fields',
  VALIDATION_DISPLAY_NAME_MAX_LENGTH: 'validation_display_name_max_length',
  VALIDATION_DISPLAY_NAME_INVALID: 'validation_display_name_invalid',
  VALIDATION_BIO_MAX_LENGTH: 'validation_bio_max_length',
  VALIDATION_BIO_INVALID: 'validation_bio_invalid',
  VALIDATION_AVATAR_REQUIRED: 'validation_avatar_required',
  VALIDATION_AVATAR_FORMAT: 'validation_avatar_format',
  VALIDATION_PREFERRED_LANGUAGE_INVALID: 'validation_preferred_language_invalid',
  FILE_TOO_LARGE: 'file_too_large',

  // Validation — messages
  VALIDATION_MESSAGE_CONTENT_REQUIRED: 'validation_message_content_required',
  VALIDATION_MESSAGE_CONTENT_EMPTY: 'validation_message_content_empty',
  VALIDATION_MESSAGE_CONTENT_MAX_LENGTH: 'validation_message_content_max_length',

  // Not found
  ARTICLE_NOT_FOUND: 'article_not_found',
  COMMENT_NOT_FOUND: 'comment_not_found',
  USER_NOT_FOUND: 'user_not_found',
  NOTIFICATION_NOT_FOUND: 'notification_not_found',
  FRIEND_REQUEST_NOT_FOUND: 'friend_request_not_found',
  FRIENDSHIP_NOT_FOUND: 'friendship_not_found',

  // Ownership / permission
  ARTICLE_EDIT_FORBIDDEN: 'article_edit_forbidden',
  ARTICLE_DELETE_FORBIDDEN: 'article_delete_forbidden',
  ARTICLE_LIKE_OWN_FORBIDDEN: 'article_like_own_forbidden',
  COMMENT_EDIT_FORBIDDEN: 'comment_edit_forbidden',
  COMMENT_DELETE_FORBIDDEN: 'comment_delete_forbidden',
  NOTIFICATION_MARK_READ_FORBIDDEN: 'notification_mark_read_forbidden',

  // Social graph — friends
  FRIEND_SELF_FORBIDDEN: 'friend_self_forbidden',
  FRIEND_ALREADY: 'friend_already',
  FRIEND_REQUEST_ALREADY_PENDING: 'friend_request_already_pending',
  FRIEND_REQUEST_DECLINED: 'friend_request_declined',
  FRIEND_RESPOND_SELF_FORBIDDEN: 'friend_respond_self_forbidden',
  FRIEND_NOT_ADDRESSEE: 'friend_not_addressee',
  FRIEND_REMOVE_SELF_FORBIDDEN: 'friend_remove_self_forbidden',
  FRIEND_CANCEL_SELF_FORBIDDEN: 'friend_cancel_self_forbidden',

  // Social graph — follows
  FOLLOW_SELF_FORBIDDEN: 'follow_self_forbidden',
  FOLLOW_ALREADY: 'follow_already',
  FOLLOW_UNFOLLOW_SELF_FORBIDDEN: 'follow_unfollow_self_forbidden',
  FOLLOW_NOT_FOLLOWING: 'follow_not_following',

  // Messages
  MESSAGE_SELF_FORBIDDEN: 'message_self_forbidden',

  // Validation — misc
  VALIDATION_FRIEND_ACTION_INVALID: 'validation_friend_action_invalid',

  // OAuth
  OAUTH_PROFILE_MISSING_PROVIDER_ID: 'oauth_profile_missing_provider_id',
  OAUTH_ACCOUNT_ALREADY_LINKED: 'oauth_account_already_linked',
  OAUTH_ACCOUNT_LINK_DUPLICATE: 'oauth_account_link_duplicate',
  OAUTH_PROFILE_INVALID_PAYLOAD: 'oauth_profile_invalid_payload',
  OAUTH_NOT_CONFIGURED: 'oauth_not_configured',
  OAUTH_PROVIDER_NOT_ENABLED: 'oauth_provider_not_enabled',
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]
