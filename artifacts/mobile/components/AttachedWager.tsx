import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';

const getFlag = (team: string) => {
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️" };
  return flags[team] || "";
};

const getCrestUrl = (team: string) => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png", "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Crystal Palace": "https://a.espncdn.com/i/teamlogos/soccer/500/384.png"
  };
  return crests[team] || null;
};

export function AttachedWager({ wagerId }: { wagerId: string }) {
  const colors = useColors();
  const [wager, setWager] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWager = async () => {
      if (!wagerId) return;
      const { data: wData } = await supabase.from('wagers').select('*').eq('id', wagerId).single();
      if (wData) {
        const fId = wData.fixture_id || wData.fixtureId;
        const { data: fData } = await supabase.from('fixtures').select('*').eq('id', fId).single();
        setWager({ ...wData, fixture: fData });
      }
      setLoading(false);
    };
    fetchWager();
  }, [wagerId]);

  if (loading) return <View style={{ padding: 12 }}><ActivityIndicator color={colors.mutedForeground as string} size="small" /></View>;
  if (!wager) return null;

  const f = wager.fixture || {};
  const home = f.homeTeam || f.home_team || "Home";
  const away = f.awayTeam || f.away_team || "Away";
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

  // Forces the component to adopt a light card background so it is readable inside dark DM bubbles
  const textColor = colors.foreground;
  const muteColor = colors.mutedForeground;
  const bgColor = won ? "rgba(52, 199, 89, 0.05)" : lost ? "rgba(255, 59, 48, 0.05)" : colors.background;

  return (
    <View style={[styles.miniReceipt, { borderColor: colors.border, backgroundColor: bgColor }]}>
      <View style={styles.miniReceiptTop}>
        <Text style={[styles.miniReceiptLabel, { color: muteColor }]}>Prediction</Text>
        <View style={[styles.miniReceiptBadge, { backgroundColor: won ? colors.primary : lost ? colors.secondary : colors.border }]}>
           <Text style={[styles.miniReceiptStatus, { color: won ? colors.primaryForeground : colors.foreground }]}>{won ? "WON" : lost ? "LOST" : "PENDING"}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        {hCrest ? <Image source={{ uri: hCrest as string }} style={{ width: 14, height: 14, marginRight: 4 }} /> : <Text style={{ fontSize: 13, color: textColor }}>{getFlag(home) || "⚽"} </Text>}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: textColor }}>{home} vs </Text>
        {aCrest ? <Image source={{ uri: aCrest as string }} style={{ width: 14, height: 14, marginRight: 4, marginLeft: 2 }} /> : <Text style={{ fontSize: 13, color: textColor }}>{getFlag(away) || "⚽"} </Text>}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: textColor }}>{away}{scoreText}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {isDraw ? (
          <Text style={[styles.miniReceiptPred, { color: textColor }]}>⚖️ Draw</Text>
        ) : (
          <>
            {cCrest ? <Image source={{ uri: cCrest as string }} style={{ width: 16, height: 16, marginRight: 6 }} /> : <Text style={{ fontSize: 16, marginRight: 4, color: textColor }}>{getFlag(choice) || "⚽"}</Text>}
            <Text style={[styles.miniReceiptPred, { color: textColor }]}>{choice}</Text>
          </>
        )}
      </View>
      <Text style={[styles.miniReceiptPts, { color: muteColor }]}>{won ? `+${wager.payout} pts` : lost ? `-${wager.amount} pts` : `${wager.amount} pts at stake`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  miniReceipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, marginTop: 4, minWidth: 260 },
  miniReceiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  miniReceiptLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  miniReceiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniReceiptStatus: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  miniReceiptPred: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 0 },
  miniReceiptPts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});