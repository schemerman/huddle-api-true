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

  if (loading) return <View style={{ padding: 10 }}><ActivityIndicator color={colors.foreground as string} /></View>;
  if (!wager) return null;

  const f = wager.fixture || {};
  const home = f.homeTeam || f.home_team || "Home";
  const away = f.awayTeam || f.away_team || "Away";
  const hScore = f.homeScore ?? f.home_score;
  const aScore = f.awayScore ?? f.away_score;
  const choice = wager.prediction || wager.choice;
  const isDraw = choice === "Draw";

  const isWon = wager.status === 'won';
  const isLost = wager.status === 'lost';

  const hCrest = getCrestUrl(home);
  const aCrest = getCrestUrl(away);
  const cCrest = getCrestUrl(choice);

  let scoreText = "";
  if (hScore !== undefined && aScore !== undefined && hScore !== null && aScore !== null) {
      scoreText = ` (${hScore} - ${aScore})`;
  }

  return (
    <View style={[styles.receipt, { borderColor: colors.border, backgroundColor: isWon ? "rgba(52, 199, 89, 0.05)" : isLost ? "rgba(255, 59, 48, 0.05)" : colors.background }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>PREDICTION</Text>
        <View style={[styles.badge, { backgroundColor: isWon ? colors.primary : isLost ? colors.secondary : colors.border }]}>
           <Text style={[styles.status, { color: isWon ? colors.primaryForeground : colors.foreground }]}>{isWon ? "WON" : isLost ? "LOST" : "PENDING"}</Text>
        </View>
      </View>

      <View style={styles.matchRow}>
        {hCrest ? <Image source={{ uri: hCrest }} style={styles.crest} /> : <Text style={styles.flag}>{getFlag(home) || "⚽"} </Text>}
        <Text style={[styles.matchText, { color: colors.foreground }]}>{home} vs </Text>
        {aCrest ? <Image source={{ uri: aCrest }} style={styles.crest} /> : <Text style={styles.flag}>{getFlag(away) || "⚽"} </Text>}
        <Text style={[styles.matchText, { color: colors.foreground }]}>{away}{scoreText}</Text>
      </View>

      <View style={styles.choiceRow}>
        {isDraw ? (
          <Text style={[styles.choiceText, { color: colors.foreground }]}>⚖️ Draw</Text>
        ) : (
          <>
            {cCrest ? <Image source={{ uri: cCrest }} style={styles.crestLarge} /> : <Text style={styles.flagLarge}>{getFlag(choice) || "⚽"} </Text>}
            <Text style={[styles.choiceText, { color: colors.foreground }]}>{choice}</Text>
          </>
        )}
      </View>
      <Text style={[styles.pts, { color: colors.mutedForeground }]}>{isWon ? `+${wager.payout} pts` : isLost ? `-${wager.amount} pts` : `${wager.amount} pts at stake`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, marginTop: 4, width: '100%', minWidth: 240 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  status: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  matchRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 },
  crest: { width: 14, height: 14, marginRight: 4 },
  flag: { fontSize: 13, marginRight: 2 },
  matchText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  choiceRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  crestLarge: { width: 16, height: 16, marginRight: 6 },
  flagLarge: { fontSize: 16, marginRight: 4 },
  choiceText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  pts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});