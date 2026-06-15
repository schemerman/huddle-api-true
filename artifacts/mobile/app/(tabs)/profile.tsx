import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, logout, claimDailyBonus } = useAuth();
  const [isClaimed, setIsClaimed] = useState(false);
  const [wagers, setWagers] = useState<any[]>([]);

  // Check if claimed today on mount
  useEffect(() => {
    AsyncStorage.getItem('last_bonus_claim').then(val => {
      if (val && Date.now() - parseInt(val) < 86400000) setIsClaimed(true);
    });
  }, []);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from("wagers").select("*").eq("user_id", user.id).then(({ data }) => setWagers(data || []));
  }, [user?.id]));

  const handleBonus = async () => {
    const success = await claimDailyBonus();
    if (success) {
      setIsClaimed(true);
      AsyncStorage.setItem('last_bonus_claim', Date.now().toString());
      Alert.alert("Success", "Daily bonus added!");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={logout}><Text style={{ color: 'red' }}>Logout</Text></Pressable>
      </View>
      
      <ScrollView>
        <View style={styles.hero}><Text style={styles.name}>{user?.displayName}</Text></View>
        
        {/* THE GREY BUTTON */}
        <Pressable 
          disabled={isClaimed} 
          onPress={handleBonus} 
          style={[styles.btn, { backgroundColor: isClaimed ? '#E5E5EA' : '#000' }]}
        >
          <Text style={{ color: isClaimed ? '#8E8E93' : '#FFF', fontWeight: 'bold' }}>
            {isClaimed ? "Bonus Claimed" : "Claim Daily Bonus"}
          </Text>
        </Pressable>

        <View style={{ padding: 20 }}>
           <Text>Points: {user?.points.toLocaleString()}</Text>
           <Text>Picks: {wagers.length}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold' },
  hero: { padding: 20 },
  name: { fontSize: 20 },
  btn: { padding: 15, margin: 20, borderRadius: 10, alignItems: 'center' }
});