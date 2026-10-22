import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { hasSavedLogin, isReturningFromSignIn, signInErrorFromUrl, supabase } from "@/lib/supabase";
import { showError } from "@/lib/alerts";

const SIGN_IN_RETURN_TIMEOUT_MS = 15_000;

// The first screen. It decides where to go without waiting on the internet, so the app never sits on a
// blank white screen while an expired login is renewed over a slow mobile connection.
export default function Index() {
  const [destination, setDestination] = useState<"app" | "login" | null>(null);

  useEffect(() => {
    let active = true;
    const go = (to: "app" | "login") => { if (active) setDestination(to); };

    if (isReturningFromSignIn()) {
      // Back from Google: let Supabase finish signing in (it reads the result from the URL).
      const error = signInErrorFromUrl();
      if (error) {
        if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        showError("Google sign-in didn't work", error);
        go("login");
      } else {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SIGN_IN_RETURN_TIMEOUT_MS));
        Promise.race([supabase.auth.getSession().then(({ data }) => data.session), timeout])
          .then(async (session) => go(session || (await hasSavedLogin()) ? "app" : "login"))
          .catch(() => go("login"));
      }
    } else {
      // Normal start: a saved login on this device means straight into the app. Supabase renews it in the background.
      hasSavedLogin().then((saved) => go(saved ? "app" : "login"));
    }

    return () => { active = false; };
  }, []);

  if (destination === "app") return <Redirect href="/(tabs)" />;
  if (destination === "login") return <Redirect href="/(auth)/login" />;

  return (
    <View style={styles.boot}>
      <Text style={styles.brand}>HUDDLE</Text>
      <ActivityIndicator color="#000000" />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 18 },
  brand: { fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: -0.5, color: "#000000" },
});
