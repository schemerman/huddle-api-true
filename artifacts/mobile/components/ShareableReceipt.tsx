import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ReceiptCard, receiptCrestTeams } from "@/components/ReceiptCard";
import { getCrestUrl } from "@/utils/teams";

export type ShareableReceiptProps = {
  question: string;
  finalResult: string;
  prediction: string;
  points: number;
  won: boolean;
  username: string;
  /** Called once every badge has loaded, so the image can be captured with them. */
  onReady?: () => void;
};

export const SHARE_URL = "https://huddle-mobile.vercel.app";

// Web: turn an online badge into an embedded image so it's always in the captured picture.
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// The in-app receipt, framed for a 9:16 story (360×640, saved at 3× = 1080×1920),
// with a "join me" footer. Used for WhatsApp, Instagram Stories, Snapchat…
export const ShareableReceipt = forwardRef<View, ShareableReceiptProps>(function ShareableReceipt(
  { question, finalResult, prediction, points, won, username, onReady },
  ref
) {
  const teams = receiptCrestTeams(question, finalResult, prediction);
  const urls = Array.from(new Set(teams.map((t) => getCrestUrl(t)).filter((u): u is string => !!u)));
  const key = urls.join("|");

  // Web: wait for embedded copies of the badges. Native: use the online badges directly.
  const [sources, setSources] = useState<Record<string, string> | null>(Platform.OS === "web" ? null : {});
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let active = true;
    setSources(null);
    Promise.all(urls.map(async (u) => [u, (await toDataUrl(u)) ?? u] as const)).then((pairs) => {
      if (active) setSources(Object.fromEntries(pairs));
    });
    return () => { active = false; };
  }, [key]);

  // Count badge images as they finish loading; report ready once all are in.
  const imagesExpected = teams.filter((t) => getCrestUrl(t)).length;
  const settled = useRef(0);
  const reported = useRef(false);
  const reportReady = () => {
    if (!reported.current) {
      reported.current = true;
      onReady?.();
    }
  };
  useEffect(() => {
    settled.current = 0;
    reported.current = false;
  }, [key, sources]);
  useEffect(() => {
    if (sources && imagesExpected === 0) reportReady();
  }, [sources, imagesExpected]);
  const onCrestSettled = () => {
    settled.current += 1;
    if (settled.current >= imagesExpected) reportReady();
  };

  const crestFor = (team: string) => {
    const url = getCrestUrl(team);
    if (!url) return null;
    return sources?.[url] ?? url;
  };

  return (
    <View ref={ref} collapsable={false} style={styles.story}>
      {sources ? (
        <ReceiptCard
          question={question}
          finalResult={finalResult}
          prediction={prediction}
          points={points}
          won={won}
          username={username}
          crestFor={crestFor}
          onCrestSettled={onCrestSettled}
          style={styles.card}
        />
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.cta}>Think you can beat me?</Text>
        <Text style={styles.join}>Join me on Huddle</Text>
        <Text style={styles.url}>{SHARE_URL.replace("https://", "")}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  story: { width: 360, height: 640, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 36, paddingBottom: 28, alignItems: "center", justifyContent: "space-between" },
  card: { maxWidth: 320 },
  footer: { alignItems: "center", gap: 2 },
  cta: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#000000" },
  join: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#000000" },
  url: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#8A8A8A", marginTop: 2 },
});
