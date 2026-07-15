import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  placeWager as apiPlaceWager,
  claimDaily as apiClaimDaily,
  claimBailout as apiClaimBailout,
} from "@workspace/api-client-react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface HuddleUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  display_name?: string; // FIX: Added to match Supabase exactly
  dob: string;
  avatarColor: string;
  avatar_color?: string; // FIX: Added to match Supabase exactly
  winRate: number;
  currentStreak: number;
  points: number;
  isBankrupt: boolean;
  previousWagers: number;
  joinedGroups: string[];
  lastDailyClaim: number;
  profileComplete: boolean;
}

export interface WagerDetails {
  fixtureId: string;
  choice: string;
  question: string;
  prediction: string;
  amount: number;
  odds: number;
}

interface AuthContextType {
  user: HuddleUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; user: HuddleUser | null }>;
  register: (email: string, password: string) => Promise<{ error: string | null }>;
  completeProfile: (username: string, dob: string, avatarColor: string) => Promise<void>;
  placeWager: (details: WagerDetails) => Promise<void>;
  claimDailyBonus: () => Promise<boolean>;
  claimBailout: () => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<HuddleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchUserProfile(session.user.id);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchUserProfile(session.user.id);
      else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (!error && data) {
      setUser({ ...data, lastDailyClaim: data.lastDailyClaim ? new Date(data.lastDailyClaim).getTime() : 0 });
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, user: null };
    
    const { data: profile } = await supabase.from("users").select("*").eq("id", data.user.id).single();
    return { error: null, user: profile as HuddleUser };
  };

  const register = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const completeProfile = async (username: string, dob: string, avatarColor: string) => {
    if (!user) return;
    
    const { error } = await supabase.from("users").update({
      username: username,
      display_name: username,
      dob: dob,
      avatar_color: avatarColor,
      profile_complete: true
    }).eq("id", user.id);
    
    if (error) {
      throw new Error(error.message); 
    }
    
    await fetchUserProfile(user.id);
  };

  const placeWager = async (details: WagerDetails) => {
    if (!user) throw new Error("Not signed in");
    await apiPlaceWager(user.id, details);
    await fetchUserProfile(user.id);
  };

  const claimDailyBonus = async (): Promise<boolean> => {
    if (!user) return false;
    const result = await apiClaimDaily(user.id);
    await fetchUserProfile(user.id);
    return result.claimed;
  };

  const claimBailout = async (): Promise<boolean> => {
    if (!user) return false;
    const result = await apiClaimBailout(user.id);
    await fetchUserProfile(user.id);
    return result.claimed;
  };

  const joinGroup = async (groupId: string) => {
    // Standard social function
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, completeProfile, placeWager, claimDailyBonus, claimBailout, joinGroup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}