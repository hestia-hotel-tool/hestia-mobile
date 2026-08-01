/**
 * App-wide constants
 */

export const APP_CONFIG = {
  DESIGN_WIDTH: 440,
  DESIGN_HEIGHT: 800,
} as const;

export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@hestia/auth_token',
  USER_DATA: '@hestia/user_data',
  THEME: '@hestia/theme',
  LANGUAGE: '@hestia/language',
} as const;

