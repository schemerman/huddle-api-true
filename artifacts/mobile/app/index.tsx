import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator color="#000000" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.profileComplete) return <Redirect href="/(auth)/complete-profile" />;
  return <Redirect href="/(tabs)" />;
}
