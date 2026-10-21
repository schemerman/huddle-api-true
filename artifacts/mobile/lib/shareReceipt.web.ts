// Website version (the App Store / Play Store builds use shareReceipt.ts).
import { toBlob } from "html-to-image";

export type PreparedImage = { file: File; blob: Blob };
export type ShareOutcome = "shared" | "downloaded" | "cancelled";

/** Turns the off-screen story card into a 1080×1920 PNG. */
export async function prepareReceiptImage(view: any): Promise<PreparedImage> {
  const node = view as HTMLElement;
  const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, backgroundColor: "#FFFFFF" });
  if (!blob) throw new Error("Couldn't create the image.");
  return { blob, file: new File([blob], "huddle-receipt.png", { type: "image/png" }) };
}

/**
 * On phones this opens the share sheet (WhatsApp, Instagram Stories, Snapchat…).
 * Browsers that can't share files (most desktops) download the image and copy the invite link instead.
 * Call it straight from a tap: Safari only allows sharing right after the user taps something.
 */
export async function shareReceiptImage(image: PreparedImage, opts: { text: string; url: string; fileName: string }): Promise<ShareOutcome> {
  const file = new File([image.blob], opts.fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `${opts.text} ${opts.url}` });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelled";
      throw e;
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(image.blob);
  link.download = opts.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  try {
    await navigator.clipboard.writeText(`${opts.text} ${opts.url}`);
  } catch {
    // Clipboard can be blocked; the download still worked.
  }
  return "downloaded";
}
