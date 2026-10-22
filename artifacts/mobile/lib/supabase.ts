import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vpmpsgpjkitjoyumgvir.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbXBzZ3Bqa2l0am95dW1ndmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjM2OTcsImV4cCI6MjA5NjY5OTY5N30.9F0Su7mw8QEAgbURqM1xgPapQS6OBp-89ijnMR_B0KU";

/** Where Supabase keeps the saved login on this device (its default name, so nobody is signed out). */
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

const AUTH_REQUEST_TIMEOUT_MS = 10_000;

// Renewing an expired login can hang on a weak mobile connection, and every screen waits for it.
// Sign-in requests get 10 seconds; everything else (uploads, data) keeps the browser's normal limits.
const fetchWithAuthTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (!url.includes('/auth/v1/') || typeof AbortController === 'undefined') return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  init?.signal?.addEventListener?.('abort', () => controller.abort());
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On the website, Google sign-in returns here with the session in the URL; pick it up on load.
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    headers: { 'x-client-info': 'huddle-mobile' },
    fetch: fetchWithAuthTimeout,
  },
});

/**
 * Is there a saved login on this device? Reads storage directly, so it answers instantly even while
 * Supabase is still renewing an expired login over a slow connection.
 */
export async function hasSavedLogin(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    return !!(saved?.refresh_token || saved?.access_token);
  } catch {
    return false;
  }
}

/** True while the page URL holds a Google sign-in result that Supabase still has to finish. */
export function isReturningFromSignIn(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return /access_token=|refresh_token=|[?&]code=|error_description=/.test(hash + search);
}

/** The error Google/Supabase sent back in the URL, if sign-in failed. */
export function signInErrorFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.replace(/^#/, '')}`);
  const message = params.get('error_description');
  return message ? message.replace(/\+/g, ' ') : null;
}
