import { Alert, Platform } from "react-native";

// Alert.alert does nothing on react-native-web, so fall back to the browser dialog there.
export function showError(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
