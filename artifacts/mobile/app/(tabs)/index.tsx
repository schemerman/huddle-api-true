import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  // 1. The Safety Net: Wait here until Supabase has handed us the user data
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // 2. If they truly have no account session, bounce them to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3. Data is loaded and secure, safe to render the tabs
  return <Redirect href="/(tabs)" />;
}