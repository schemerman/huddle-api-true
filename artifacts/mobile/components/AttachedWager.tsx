import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { getCrestUrl, getFlag } from '@/utils/teams';

type WagerWithFixture = Record<string, any> & { fixture: Record<string, any> | null };

// Settled wagers (won/lost) and missing ids never change, so keep them for the session.
// Chat lists re-mount rows often; this stops the card refetching and flashing a spinner.
const wagerCache = new Map<string, WagerWithFixture | null>();

async function loadWager(wagerId: string): Promise<WagerWithFixture | null> {
  const { data: wager, error } = await supabase.from('wagers').select('*').eq('id', wagerId).maybeSingle();
  if (error) return null;
  if (!wager) {
    wagerCache.set(wagerId, null);
    return null;
  }

  const fixtureId = wager.fixture_id ?? wager.fixtureId;
  let fixture: Record<string, any> | null = null;
  if (fixtureId !== null && fixtureId !== undefined) {
    const { data } = await supabase.from('fixtures').select('*').eq('id', fixtureId).maybeSingle();
    fixture = data ?? null;
  }

  const result = { ...wager, fixture };
  if (wager.status === 'won' || wager.status === 'lost') wagerCache.set(wagerId, result);
  return result;
}

export function AttachedWager({ wagerId, style }: { wagerId: string; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const cached = wagerId ? wagerCache.get(wagerId) : null;
  const [wager, setWager] = useState<WagerWithFixture | null>(cached ?? null);
  const [loading, setLoading] = useState(!!wagerId && cached === undefined);

  useEffect(() => {
    if (!wagerId) {
      setWager(null);
      setLoading(false);
      return;
    }
    const hit = wagerCache.get(wagerId);
    if (hit !== undefined) {
      setWager(hit);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadWager(wagerId)
      .catch(() => null)
      .then((result) => {
        if (cancelled) return;
        setWager(result);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wagerId]);

  if (loading) return <View style={[{ padding: 12 }, style]}><ActivityIndicator color={colors.mutedForeground as string} size="small" /></View>;
  if (!wager) return null;

  const f = wager.fixture || {};
  const home = f.homeTeam || f.home_team || wager.homeTeam || wager.home_team;
  const away = f.awayTeam || f.away_team || wager.awayTeam || wager.away_team;
  const hScore = f.homeScore ?? f.home_score;
  const aScore = f.awayScore ?? f.away_score;
  const choice = wager.prediction || wager.choice;
  const isDraw = choice === "Draw";

  const won = wager.status === 'won';
  const lost = wager.status === 'lost';

  const hCrest = getCrestUrl(home);
  const aCrest = getCrestUrl(away);
  const cCrest = getCrestUrl(choice);

  let scoreText = "";
  if (hScore !== undefined && aScore !== undefined && hScore !== null && aScore !== null) {
    scoreText = ` (${hScore} - ${aScore})`;
  }

  // Same look as the mini receipt on the home feed: a light card with a faint win/loss tint.
  const textColor = colors.foreground;
  const muteColor = colors.mutedForeground;
  const bgColor = won ? "rgba(52, 199, 89, 0.05)" : lost ? "rgba(255, 59, 48, 0.05)" : colors.background;
  const pointsText = won ? `+${wager.payout ?? wager.amount} pts` : lost ? `-${wager.amount} pts` : `${wager.amount} pts in play`;

  return (
    <View style={[styles.miniReceipt, { borderColor: colors.border, backgroundColor: bgColor }, style]}>
      <View style={styles.miniReceiptTop}>
        <Text style={[styles.miniReceiptLabel, { color: muteColor }]}>Prediction</Text>
        <View style={[styles.miniReceiptBadge, { backgroundColor: won ? colors.primary : lost ? colors.secondary : colors.border }]}>
          <Text style={[styles.miniReceiptStatus, { color: won ? colors.primaryForeground : colors.foreground }]}>{won ? "WON" : lost ? "LOST" : "PENDING"}</Text>
        </View>
      </View>

      {home && away ? (
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          {hCrest ? <Image source={{ uri: hCrest }} style={{ width: 14, height: 14, marginRight: 4 }} /> : <Text style={{ fontSize: 13, color: textColor }}>{getFlag(home) || "⚽"} </Text>}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: textColor }}>{home} vs </Text>
          {aCrest ? <Image source={{ uri: aCrest }} style={{ width: 14, height: 14, marginRight: 4, marginLeft: 2 }} /> : <Text style={{ fontSize: 13, color: textColor }}>{getFlag(away) || "⚽"} </Text>}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: textColor }}>{away}{scoreText}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {isDraw ? (
          <Text style={[styles.miniReceiptPred, { color: textColor }]}>⚖️ Draw</Text>
        ) : (
          <>
            {cCrest ? <Image source={{ uri: cCrest }} style={{ width: 16, height: 16, marginRight: 6 }} /> : <Text style={{ fontSize: 16, marginRight: 4, color: textColor }}>{getFlag(choice) || "⚽"}</Text>}
            <Text style={[styles.miniReceiptPred, { color: textColor }]}>{choice}</Text>
          </>
        )}
      </View>
      <Text style={[styles.miniReceiptPts, { color: muteColor }]}>{pointsText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  miniReceipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, marginTop: 4, minWidth: 260, maxWidth: "100%" },
  miniReceiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  miniReceiptLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  miniReceiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniReceiptStatus: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  miniReceiptPred: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 0 },
  miniReceiptPts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
