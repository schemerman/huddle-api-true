import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Explicitly ask Supabase if a session exists in local storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setIsReady(true); // Don't allow any redirects until this is true
    });
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (!hasSession) {
    return <Redirect href="/(auth)/login" />;
  }

  // If they have a session, drop them right onto the main app
  return <Redirect href="/(tabs)" />; 
}