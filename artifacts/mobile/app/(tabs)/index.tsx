import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Index() {
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      // A tiny delay stops Expo Router from crashing during the initial mount
      if (session) {
        setTimeout(() => router.replace("/(tabs)"), 50);
      } else {
        setTimeout(() => router.replace("/(auth)/login"), 50);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
      <ActivityIndicator size="large" color="#000000" />
    </View>
  );
}