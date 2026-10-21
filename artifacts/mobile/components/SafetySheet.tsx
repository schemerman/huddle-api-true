import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/lib/alerts";
import { REPORT_REASONS, blockUser, reportContent, unblockUser, useBlockedIds, type ReportTarget } from "@/lib/safety";

export type SafetyTarget = {
  type: ReportTarget;
  id: string; // the post / comment / message / user id being reported
  userId: string; // the person who'd be blocked
  name: string; // shown as "@name"
};

/** Report / Block sheet for a post, comment, message or profile. */
export function SafetySheet({ target, onClose }: { target: SafetyTarget | null; onClose: () => void }) {
  const colors = useColors();
  const blocked = useBlockedIds();
  const [step, setStep] = useState<"menu" | "report" | "done">("menu");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneText, setDoneText] = useState("");

  useEffect(() => {
    if (target) { setStep("menu"); setAlsoBlock(false); setBusy(false); }
  }, [target]);

  if (!target) return null;
  const isBlocked = blocked.has(target.userId);
  const what = target.type === "user" ? "account" : target.type;

  const finish = (text: string) => { setDoneText(text); setStep("done"); };

  const sendReport = async (reason: string) => {
    setBusy(true);
    try {
      await reportContent(target.type, target.id, reason);
      if (alsoBlock && !isBlocked) await blockUser(target.userId);
      finish(alsoBlock ? `Thanks for telling us. We'll review it, and you've blocked @${target.name}.` : "Thanks for telling us. We'll review it.");
    } catch (e: any) {
      showError("Couldn't send the report", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    setBusy(true);
    try {
      if (isBlocked) {
        await unblockUser(target.userId);
        finish(`You've unblocked @${target.name}.`);
      } else {
        await blockUser(target.userId);
        finish(`You've blocked @${target.name}. They can't message you, and you won't see their posts or comments.`);
      }
    } catch (e: any) {
      showError("Something went wrong", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => {}}>
          {step === "menu" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>@{target.name}</Text>
              <Pressable onPress={() => setStep("report")} style={[styles.row, { borderColor: colors.border }]}>
                <Feather name="flag" size={18} color="#FF3B30" />
                <Text style={[styles.rowText, { color: "#FF3B30" }]}>Report {what}</Text>
              </Pressable>
              <Pressable onPress={toggleBlock} disabled={busy} style={[styles.row, { borderColor: colors.border }]}>
                {busy ? <ActivityIndicator size="small" color={colors.foreground as string} /> : <Feather name={isBlocked ? "unlock" : "slash"} size={18} color={colors.foreground} />}
                <Text style={[styles.rowText, { color: colors.foreground }]}>{isBlocked ? "Unblock" : "Block"} @{target.name}</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {step === "report" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Why are you reporting this?</Text>
              {REPORT_REASONS.map((reason) => (
                <Pressable key={reason} onPress={() => sendReport(reason)} disabled={busy} style={[styles.row, { borderColor: colors.border, opacity: busy ? 0.5 : 1 }]}>
                  <Text style={[styles.rowText, { color: colors.foreground }]}>{reason}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
              {!isBlocked && (
                <Pressable onPress={() => setAlsoBlock((v) => !v)} style={styles.blockToggle} accessibilityRole="checkbox" accessibilityState={{ checked: alsoBlock }}>
                  <View style={[styles.checkbox, { borderColor: colors.foreground, backgroundColor: alsoBlock ? colors.foreground : "transparent" }]}>
                    {alsoBlock ? <Feather name="check" size={13} color={colors.background} /> : null}
                  </View>
                  <Text style={[styles.toggleText, { color: colors.foreground }]}>Also block @{target.name}</Text>
                </Pressable>
              )}
              {busy ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.mutedForeground as string} /> : null}
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {step === "done" && (
            <>
              <Feather name="check-circle" size={28} color={colors.foreground} style={{ alignSelf: "center" }} />
              <Text style={[styles.doneText, { color: colors.foreground }]}>{doneText}</Text>
              <Pressable onPress={onClose} style={[styles.doneBtn, { backgroundColor: colors.foreground }]}>
                <Text style={[styles.doneBtnText, { color: colors.background }]}>Done</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A "…" button that opens the Report / Block sheet. Hidden on your own content. */
export function SafetyMenuButton({ target, size = 18 }: { target: SafetyTarget; size?: number }) {
  const colors = useColors();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!target.userId || target.userId === user?.id) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="More options">
        <Feather name="more-horizontal" size={size} color={colors.mutedForeground} />
      </Pressable>
      <SafetySheet target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 18, gap: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 8, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1 },
  rowText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  blockToggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toggleText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  cancel: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  doneText: { fontFamily: "Inter_500Medium", fontSize: 15, lineHeight: 21, textAlign: "center", marginVertical: 12 },
  doneBtn: { borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
