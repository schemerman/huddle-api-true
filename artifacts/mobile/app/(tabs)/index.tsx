import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const colors = useColors();

  useEffect(() => {
    let isMounted = true;

    const routeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (session) {
          router.replace("/(tabs)");
        } else {
          // Adjust this path if your login screen is just "/login"
          router.replace("/(auth)/login"); 
        }
      } catch (error) {
        if (isMounted) router.replace("/(auth)/login");
      }
    };

    routeUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // An entirely silent, invisible background that perfectly matches your app theme. 
  // No spinners, no loading text, no white-screen crashes.
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}