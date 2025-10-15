/**
 * Timing constants used throughout the application
 */

// Debounce delay for search input (in milliseconds)
export const SEARCH_DEBOUNCE_DELAY = 300;

// Authentication loading timeout - force loading to false if auth takes too long (in milliseconds)
export const AUTH_LOADING_TIMEOUT = 10000;

// Delay to give Firebase time to restore auth state from localStorage (in milliseconds)
export const AUTH_RESTORE_DELAY = 100;

// Time period after which Ready batches are auto-completed (in milliseconds)
export const BATCH_AUTO_COMPLETE_DELAY = 24 * 60 * 60 * 1000; // 24 hours
