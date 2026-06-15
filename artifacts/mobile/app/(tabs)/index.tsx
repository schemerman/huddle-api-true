import { Redirect } from "expo-router";

export default function Index() {
  // Simplest, most bulletproof root file. Let the layout handle the auth.
  return <Redirect href="/(tabs)" />;
}