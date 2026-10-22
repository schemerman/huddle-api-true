import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, Image } from "react-native";
import { SharePicker } from "@/components/SharePicker";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReceiptCard } from "@/components/ReceiptCard";
import { ShareableReceipt, SHARE_URL } from "@/components/ShareableReceipt";
import { prepareReceiptImage, shareReceiptImage, type PreparedImage } from "@/lib/shareReceipt";
import { showError } from "@/lib/alerts";

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  question: string;
  finalResult: string;
  prediction: string;
  points: number;
  won: boolean;
  wagerId?: string; 
}

export function ReceiptModal({
  visible,
  onClose,
  question,
  finalResult,
  prediction,
  points,
  won,
  wagerId,
}: ReceiptModalProps) {
  const colors = useColors();
  const { user } = useAuth();

  // Huddle and DM shares pick a destination inside the receipt card.
  const [shareMode, setShareMode] = useState<"huddle" | "dm" | null>(null);
  useEffect(() => {
    if (!visible) setShareMode(null);
  }, [visible]);

  // Home picks the receipt up from storage and opens the post composer with it attached.
  const handleShareToHome = async () => {
    if (!wagerId) return;
    await AsyncStorage.setItem("pending_share_wager", wagerId);
    onClose();
    router.navigate("/(tabs)" as any);
  };

  // Share to WhatsApp, Instagram Stories, Snapchat… as a story-sized image.
  // The image is made in the background when the receipt opens, so tapping Share can open the
  // share sheet straight away (Safari only allows that right after a tap).
  const storyRef = useRef<View>(null);
  const preparedRef = useRef<PreparedImage | null>(null);
  const [sharingOut, setSharingOut] = useState(false);
  const [storyReady, setStoryReady] = useState(false);
  const username = user?.username || "you";

  useEffect(() => {
    preparedRef.current = null;
    setStoryReady(false);
  }, [visible, shareMode, question, prediction, points, won]);

  // Fallback: if a badge never finishes loading, still prepare the image after a few seconds.
  useEffect(() => {
    if (!visible || shareMode) return;
    const timer = setTimeout(() => setStoryReady(true), 4000);
    return () => clearTimeout(timer);
  }, [visible, shareMode]);

  useEffect(() => {
    if (!visible || shareMode || !storyReady || preparedRef.current) return;
    // Give the browser a frame to paint the loaded badges before capturing.
    const timer = setTimeout(() => {
      if (!storyRef.current) return;
      prepareReceiptImage(storyRef.current)
        .then((img) => { preparedRef.current = img; })
        .catch(() => { /* made again on tap */ });
    }, 150);
    return () => clearTimeout(timer);
  }, [visible, shareMode, storyReady]);

  const shareText = won
    ? `I called ${prediction === "Draw" ? "the draw" : prediction} on Huddle and won ${points.toLocaleString()} points ✅ Think you can beat me?`
    : `My ${prediction === "Draw" ? "draw" : prediction} pick didn't land this time 😅 Think you can do better on Huddle?`;

  const handleShareOut = async () => {
    if (sharingOut) return;
    setSharingOut(true);
    try {
      let image = preparedRef.current;
      if (!image) {
        if (!storyRef.current) throw new Error("The receipt isn't ready yet. Please try again.");
        image = await prepareReceiptImage(storyRef.current);
        preparedRef.current = image;
      }
      const outcome = await shareReceiptImage(image, { text: shareText, url: SHARE_URL, fileName: "huddle-receipt.png" });
      if (outcome === "downloaded") {
        showError("Image saved", "Your receipt image has been downloaded and the invite link copied. Post it on your story or send it to friends.");
      }
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        showError("Tap Share again", "Your receipt image is ready now. Tap \"Share to other apps\" once more.");
      } else {
        showError("Couldn't share", e?.message || "Please try again.");
      }
    } finally {
      setSharingOut(false);
    }
  };

  const handleShared = (chatPath: string) => {
    setShareMode(null);
    onClose();
    router.push(chatPath as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.receiptOverlay}>
        {/* Off-screen story card, turned into the image that gets shared to other apps. */}
        {wagerId && !shareMode ? (
          <View style={styles.offscreen} pointerEvents="none">
            <ShareableReceipt ref={storyRef} question={question} finalResult={finalResult} prediction={prediction} points={points} won={won} username={username} onReady={() => setStoryReady(true)} />
          </View>
        ) : null}
        <ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayContent} showsVerticalScrollIndicator={false}>
        {shareMode && wagerId ? (
          <View style={[styles.receiptCard, { backgroundColor: colors.background, borderColor: colors.foreground, alignItems: "stretch" }]}>
            <SharePicker mode={shareMode} wagerId={wagerId} onBack={() => setShareMode(null)} onSent={handleShared} />
          </View>
        ) : (
        <ReceiptCard question={question} finalResult={finalResult} prediction={prediction} points={points} won={won} username={username}>
          <View style={styles.defaultActionContainer}>
            {wagerId && (
              <>
                <Pressable onPress={handleShareOut} disabled={sharingOut} style={({ pressed }) => [styles.receiptShareBtn, { backgroundColor: colors.foreground, opacity: pressed || sharingOut ? 0.8 : 1 }]}>
                  {sharingOut ? <ActivityIndicator size="small" color={colors.background as string} /> : <Feather name="share" size={16} color={colors.background} />}
                  <Text style={[styles.receiptShareText, { color: colors.background }]}>Share to other apps</Text>
                </Pressable>

                <Pressable onPress={handleShareToHome} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="send" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Share to Home</Text>
                </Pressable>

                <Pressable onPress={() => setShareMode("huddle")} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Share to Huddle</Text>
                </Pressable>

                <Pressable onPress={() => setShareMode("dm")} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="message-circle" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Send in DM</Text>
                </Pressable>
              </>
            )}
            
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.receiptClose,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                !wagerId && { marginTop: 12 }
              ]}
            >
              <Text style={[styles.receiptCloseText, { color: colors.foreground }]}>Close</Text>
            </Pressable>
          </View>
        </ReceiptCard>
        )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  receiptOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayScroll: { flex: 1, width: "100%" },
  overlayContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  offscreen: { position: "absolute", left: -10000, top: 0, width: 360, height: 640 },
  receiptCard: { width: "100%", maxWidth: 360, borderWidth: 2, borderRadius: 20, padding: 28, alignItems: "center" },
  defaultActionContainer: { width: "100%", gap: 8, marginTop: 10 },
  receiptShareBtn: { flexDirection: "row", borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  receiptShareText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  receiptClose: { borderWidth: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  receiptCloseText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});