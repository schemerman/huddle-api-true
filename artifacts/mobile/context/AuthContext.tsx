import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  placeWager as apiPlaceWager,
  claimDaily as apiClaimDaily,
  claimBailout as apiClaimBailout,
} from "@workspace/api-client-react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { USER_COLUMNS } from "../lib/users";

export interface HuddleUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  display_name?: string; 
  dob: string;
  avatarColor: string;
  avatar_color?: string; 
  winRate: number;
  currentStreak: number;
  points: number;
  isBankrupt: boolean;
  previousWagers: number;
  joinedGroups: string[];
  lastDailyClaim: number;
  profileComplete: boolean;
}

export type DailyBonusOutcome = "claimed" | "already_claimed" | "failed";

// Builds the app's user from a `users` row (snake_case columns). Email comes from the
// signed-in session, because the app can no longer read emails from the users table.
function toHuddleUser(row: any, email?: string | null): HuddleUser {
  return {
    ...row,
    email: email ?? "",
    displayName: row.display_name ?? row.username ?? "",
    avatarColor: row.avatar_color ?? "#000000",
    winRate: Number(row.win_rate ?? 0),
    currentStreak: Number(row.current_streak ?? 0),
    isBankrupt: !!row.is_bankrupt,
    previousWagers: Number(row.total_picks ?? 0),
    joinedGroups: [],
    lastDailyClaim: row.last_daily_claim ? Date.parse(row.last_daily_claim) : 0,
    profileComplete: !!row.profile_complete,
    dob: "",
  };
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
  completeProfile: (displayName: string, username: string, dob: string, avatarColor: string) => Promise<void>;
  placeWager: (details: WagerDetails) => Promise<void>;
  claimDailyBonus: () => Promise<DailyBonusOutcome>;
  claimBailout: () => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Reload the signed-in user's row, e.g. after picks settle and points change. */
  refreshUser: () => Promise<void>;
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
    const [{ data, error }, { data: auth }] = await Promise.all([
      supabase.from("users").select(USER_COLUMNS).eq("id", userId).single(),
      supabase.auth.getSession(),
    ]);
    if (!error && data) setUser(toHuddleUser(data, auth.session?.user?.email));
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, user: null };
    
    const { data: profile } = await supabase.from("users").select(USER_COLUMNS).eq("id", data.user.id).single();
    return { error: null, user: profile ? toHuddleUser(profile, data.user.email) : null };
  };

  const register = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  // UPDATED: Now requires displayName!
  const completeProfile = async (displayName: string, username: string, dob: string, avatarColor: string) => {
    if (!user) return;
    
    const { error } = await supabase.from("users").update({
      display_name: displayName,
      username: username,
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

  // The server pays 100 points at most once per 24 hours per account (rolling, from the last claim).
  const claimDailyBonus = async (): Promise<DailyBonusOutcome> => {
    if (!user) return "failed";
    try {
      const result = await apiClaimDaily(user.id);
      return result.claimed ? "claimed" : "already_claimed";
    } catch (e) {
      console.warn("Daily bonus claim failed:", e);
      return "failed";
    } finally {
      // Reload the account so points and last_daily_claim (which drives the button lock) are current.
      await fetchUserProfile(user.id);
    }
  };

  const claimBailout = async (): Promise<boolean> => {
    if (!user) return false;
    const result = await apiClaimBailout(user.id);
    await fetchUserProfile(user.id);
    return result.claimed;
  };

  const joinGroup = async (groupId: string) => {};

  const refreshUser = async () => {
    if (user) await fetchUserProfile(user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, completeProfile, placeWager, claimDailyBonus, claimBailout, joinGroup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}