import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vpmpsgpjkitjoyumgvir.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbXBzZ3Bqa2l0am95dW1ndmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjM2OTcsImV4cCI6MjA5NjY5OTY5N30.9F0Su7mw8QEAgbURqM1xgPapQS6OBp-89ijnMR_B0KU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // 🚨 Add this global header to ensure mobile requests are treated equally
  global: {
    headers: { 'x-client-info': 'huddle-mobile' },
  },
});