import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// Public bucket created by supabase/sql/2026-10-16-media-and-realtime.sql.
// Each user may only upload into their own "<user id>/..." folder.
const BUCKET = "uploads";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;

export type PickedImage = {
  uri: string;
  mimeType: string | null;
  base64: string | null;
  file: Blob | null;
};

export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    // Native gets the bytes directly; on web the picked File is used instead.
    base64: Platform.OS !== "web",
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    base64: asset.base64 ?? null,
    file: asset.file ?? null,
  };
}

// Phone photos are often 5-10 MB; on web, resize to at most 1600px and re-encode as JPEG.
async function shrinkOnWeb(blob: Blob): Promise<Blob> {
  if (blob.type === "image/gif" || typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob;
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const alreadySmall = scale === 1 && blob.size <= 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(blob.type);
  if (alreadySmall) {
    bitmap.close();
    return blob;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black as JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const resized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return resized ?? blob;
}

async function toUploadBody(image: PickedImage): Promise<{ body: ArrayBuffer | Uint8Array; contentType: string }> {
  if (Platform.OS === "web") {
    const original = image.file ?? (await (await fetch(image.uri)).blob());
    const blob = await shrinkOnWeb(original);
    return { body: await blob.arrayBuffer(), contentType: blob.type || image.mimeType || "image/jpeg" };
  }
  if (image.base64) {
    const binary = atob(image.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { body: bytes, contentType: image.mimeType || "image/jpeg" };
  }
  const res = await fetch(image.uri);
  return { body: await res.arrayBuffer(), contentType: image.mimeType || "image/jpeg" };
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

/** Upload a picked photo and return its public URL. Throws with a readable message on failure. */
export async function uploadImage(image: PickedImage, userId: string, folder: "posts" | "chat"): Promise<string> {
  const { body, contentType } = await toUploadBody(image);
  if (body.byteLength > MAX_BYTES) throw new Error("That photo is over 10 MB. Please pick a smaller one.");

  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(contentType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, cacheControl: "31536000" });
  if (error) throw new Error(error.message || "Could not upload the photo.");
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
