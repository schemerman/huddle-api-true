// Native (iOS / Android) version. The website uses shareReceipt.web.ts instead.
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export type PreparedImage = { uri: string };
export type ShareOutcome = "shared" | "downloaded" | "cancelled";

/** Turns the off-screen story card into a 1080×1920 PNG file. */
export async function prepareReceiptImage(view: any): Promise<PreparedImage> {
  const uri = await captureRef(view, { format: "png", width: 1080, height: 1920, result: "tmpfile" });
  return { uri };
}

/** Opens the system share sheet (WhatsApp, Instagram Stories, Snapchat…). */
export async function shareReceiptImage(image: PreparedImage, _opts: { text: string; url: string; fileName: string }): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  await Sharing.shareAsync(image.uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your Huddle receipt" });
  return "shared";
}
