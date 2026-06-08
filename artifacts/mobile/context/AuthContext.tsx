import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  syncUser,
  placeWager as apiPlaceWager,
  claimDaily as apiClaimDaily,
  claimBailout as apiClaimBailout,
  type User as ApiUser,
} from "@workspace/api-client-react";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface HuddleUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  dob: string;
  avatarColor: string;
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  completeProfile: (username: string, dob: string, avatarColor: string) => Promise<void>;
  placeWager: (details: WagerDetails) => Promise<void>;
  claimDailyBonus: () => Promise<boolean>;
  claimBailout: () => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AVATAR_COLORS = ["#E8533A", "#3A7DE8", "#3AE86A", "#E8C83A", "#9B3AE8", "#E83A8C", "#3AE8D4"];

const STARTING_BANKROLL = 1000;

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const STORAGE_KEY = "huddle_user";

function withDefaults(raw: Partial<HuddleUser>): HuddleUser {
  const points = raw.points ?? STARTING_BANKROLL;
  return {
    id: raw.id ?? generateId(),
    email: raw.email ?? "",
    username: raw.username ?? "",
    displayName: raw.displayName ?? "",
    dob: raw.dob ?? "",
    avatarColor: raw.avatarColor ?? AVATAR_COLORS[0],
    winRate: raw.winRate ?? 0,
    currentStreak: raw.currentStreak ?? 0,
    points,
    isBankrupt: raw.isBankrupt ?? points <= 0,
    previousWagers: raw.previousWagers ?? 0,
    joinedGroups: raw.joinedGroups ?? [],
    lastDailyClaim: raw.lastDailyClaim ?? 0,
    profileComplete: raw.profileComplete ?? false,
  };
}

/**
 * Merge a server-authoritative user record into the local shape. Economy fields
 * (points, bankruptcy, wager count, daily claim) always come from the server;
 * social-only fields (joinedGroups) are preserved from local state.
 */
function mergeServerUser(server: ApiUser, local: HuddleUser | null): HuddleUser {
  return {
    id: server.id,
    email: server.email,
    username: server.username,
    displayName: server.displayName,
    dob: server.dob,
    avatarColor: server.avatarColor,
    winRate: server.winRate,
    currentStreak: server.currentStreak,
    points: server.points,
    isBankrupt: server.isBankrupt,
    previousWagers: server.previousWagers,
    joinedGroups: local?.joinedGroups ?? [],
    lastDailyClaim: server.lastDailyClaim ? new Date(server.lastDailyClaim).getTime() : 0,
    profileComplete: server.profileComplete,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<HuddleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setUser(withDefaults(JSON.parse(raw)));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const persist = async (u: HuddleUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  /** Push identity to the server and adopt the authoritative economy fields. */
  const syncToServer = async (local: HuddleUser): Promise<HuddleUser> => {
    try {
      const server = await syncUser({
        id: local.id,
        email: local.email,
        username: local.username,
        displayName: local.displayName,
        dob: local.dob,
        avatarColor: local.avatarColor,
        profileComplete: local.profileComplete,
      });
      return mergeServerUser(server, local);
    } catch {
      return local;
    }
  };

  const login = async (email: string, _password: string) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const local = raw
      ? withDefaults(JSON.parse(raw))
      : withDefaults({
          email,
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          points: STARTING_BANKROLL,
        });
    if (!raw) local.email = email;
    await persist(await syncToServer(local));
  };

  const register = async (email: string, _password: string) => {
    const local = withDefaults({
      email,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      points: STARTING_BANKROLL,
    });
    await persist(await syncToServer(local));
  };

  const completeProfile = async (username: string, dob: string, avatarColor: string) => {
    if (!user) return;
    const local: HuddleUser = {
      ...user,
      username,
      displayName: username,
      dob,
      avatarColor,
      winRate: 62,
      currentStreak: 3,
      profileComplete: true,
    };
    await persist(await syncToServer(local));
  };

  const placeWager = async (details: WagerDetails) => {
    if (!user) throw new Error("Not signed in");
    const result = await apiPlaceWager(user.id, {
      fixtureId: details.fixtureId,
      choice: details.choice,
      question: details.question,
      prediction: details.prediction,
      amount: details.amount,
      odds: details.odds,
    });
    await persist(mergeServerUser(result.user, user));
  };

  const claimDailyBonus = async (): Promise<boolean> => {
    if (!user) return false;
    const result = await apiClaimDaily(user.id);
    await persist(mergeServerUser(result.user, user));
    return result.claimed;
  };

  const claimBailout = async (): Promise<boolean> => {
    if (!user) return false;
    const result = await apiClaimBailout(user.id);
    await persist(mergeServerUser(result.user, user));
    return result.claimed;
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    if (user.joinedGroups.includes(groupId)) return;
    await persist({ ...user, joinedGroups: [...user.joinedGroups, groupId] });
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        completeProfile,
        placeWager,
        claimDailyBonus,
        claimBailout,
        joinGroup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
