import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// Google sign-in works on the website for now. The App Store / Play Store builds will
// add the native flow (and Sign in with Apple, which Apple requires alongside Google).
export const googleSignInAvailable = Platform.OS === "web";

/** Sends the browser to Google, which returns to Huddle signed in. Throws a readable error. */
export async function signInWithGoogle(): Promise<void> {
  if (!googleSignInAvailable || typeof window === "undefined") {
    throw new Error("Google sign-in isn't available in this version of the app yet.");
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
  });
  if (error) throw new Error(error.message || "Couldn't start Google sign-in.");
}
