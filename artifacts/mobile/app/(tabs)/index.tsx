import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}