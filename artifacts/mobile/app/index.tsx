import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  // The app stops here and waits for Supabase to finish checking local storage
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  // Once Supabase is done, it properly sends you to the right place
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}