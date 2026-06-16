import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check local storage for the session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    // Listen for any changes (like logging in or out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show an empty screen while Supabase checks the browser storage
  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  // Route safely once we know the truth
  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}