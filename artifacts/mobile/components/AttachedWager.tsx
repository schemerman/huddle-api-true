import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';

const getCrestUrl = (team: string) => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png", "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Spurs": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png", "Tottenham Hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Brentford": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Brentford_FC_crest.svg/1200px-Brentford_FC_crest.svg.png",
    "Ipswich Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Ipswich_Town.svg/1200px-Ipswich_Town.svg.png",
    "Hull City": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Hull_City_A.F.C._logo.svg/1200px-Hull_City_A.F.C._logo.svg.png",
    "Sunderland": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Logo_Sunderland.svg/1200px-Logo_Sunderland.svg.png",
    "Coventry City": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Coventry_City_FC_logo.svg/1200px-Coventry_City_FC_logo.svg.png"
  };
  return crests[team] || null; 
};

export function AttachedWager({ wagerId }: { wagerId: string }) {
  const colors = useColors();
  const [wager, setWager] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWager = async () => {
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

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={colors.mutedForeground as string} size="small" /></View>;
  if (!wager) return null;

  const f = wager.fixture || {};
  const home = f.homeTeam || f.home_team || "Home";
  const away = f.awayTeam || f.away_team || "Away";
  const hScore = f.homeScore ?? f.home_score ?? 0;
  const aScore = f.awayScore ?? f.away_score ?? 0;
  const choice = wager.prediction || wager.choice;
  
  const isWon = wager.status === 'won';
  const isLost = wager.status === 'lost';
  const isPending = wager.status === 'pending';

  const bgColor = isWon ? "rgba(52, 199, 89, 0.1)" : isLost ? "rgba(255, 59, 48, 0.1)" : "rgba(0,0,0,0.05)";
  const hCrest = getCrestUrl(home);
  const aCrest = getCrestUrl(away);
  const cCrest = getCrestUrl(choice);

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>PREDICTION</Text>
        {!isPending && (
          <View style={[styles.statusBadge, { backgroundColor: isWon ? "#34C759" : "#FF3B30" }]}>
            <Text style={styles.statusText}>{isWon ? "WON" : "LOST"}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.matchRow}>
        {hCrest && <Image source={{ uri: hCrest }} style={styles.crest} />}
        <Text style={[styles.matchText, { color: colors.foreground }]}>{home} vs </Text>
        {aCrest && <Image source={{ uri: aCrest }} style={styles.crest} />}
        <Text style={[styles.matchText, { color: colors.foreground }]}>{away} {(!isPending) ? `(${hScore} - ${aScore})` : ""}</Text>
      </View>

      <View style={styles.choiceRow}>
        {cCrest && <Image source={{ uri: cCrest }} style={styles.crest} />}
        <Text style={[styles.choiceText, { color: colors.foreground }]}>{choice}</Text>
      </View>
      
      <Text style={[styles.points, { color: isWon ? "#34C759" : isLost ? "#FF3B30" : colors.mutedForeground }]}>
        {isWon ? "+" : isLost ? "-" : ""}{isWon ? wager.payout : wager.amount} pts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, marginTop: 4, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFF' },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  crest: { width: 14, height: 14, marginRight: 6 },
  matchText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  choiceText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  points: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});