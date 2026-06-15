import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  // 1. Give the app a split second to pull your secure session from the database
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // 2. If they are not logged in at all, bounce them to the login screen
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3. If they are logged in, send them straight into the action!
  // No more forced profile checks.
  return <Redirect href="/(tabs)" />;
}