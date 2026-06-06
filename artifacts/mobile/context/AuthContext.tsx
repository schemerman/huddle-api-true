import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface HuddleUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  dob: string;
  avatarColor: string;
  winRate: number;
  points: number;
  isBankrupt: boolean;
  previousWagers: number;
  joinedGroups: string[];
  lastDailyClaim: number;
  profileComplete: boolean;
}

interface AuthContextType {
  user: HuddleUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  completeProfile: (username: string, dob: string, avatarColor: string) => Promise<void>;
  updatePoints: (delta: number) => Promise<void>;
  recordWager: (cost: number) => Promise<void>;
  claimDailyBonus: () => Promise<boolean>;
  claimBailout: () => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AVATAR_COLORS = ["#E8533A", "#3A7DE8", "#3AE86A", "#E8C83A", "#9B3AE8", "#E83A8C", "#3AE8D4"];

const STARTING_BANKROLL = 10000;
const SOLVENT_THRESHOLD = 500;
const DAILY_AMOUNT = 100;
const BAILOUT_AMOUNT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const STORAGE_KEY = "huddle_user";

const ECONOMY_DEFAULTS = {
  isBankrupt: false,
  previousWagers: 0,
  joinedGroups: [] as string[],
  lastDailyClaim: 0,
};

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
    points,
    isBankrupt: raw.isBankrupt ?? points <= 0,
    previousWagers: raw.previousWagers ?? 0,
    joinedGroups: raw.joinedGroups ?? [],
    lastDailyClaim: raw.lastDailyClaim ?? 0,
    profileComplete: raw.profileComplete ?? false,
  };
}

function applyBankruptcy(u: HuddleUser, newPoints: number): HuddleUser {
  const points = Math.max(0, newPoints);
  let isBankrupt = u.isBankrupt;
  if (points <= 0) isBankrupt = true;
  else if (points > SOLVENT_THRESHOLD) isBankrupt = false;
  return { ...u, points, isBankrupt };
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

  const login = async (email: string, _password: string) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      setUser(withDefaults(JSON.parse(raw)));
      return;
    }
    await persist(
      withDefaults({
        email,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        points: STARTING_BANKROLL,
      })
    );
  };

  const register = async (email: string, _password: string) => {
    await persist(
      withDefaults({
        email,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        points: STARTING_BANKROLL,
      })
    );
  };

  const completeProfile = async (username: string, dob: string, avatarColor: string) => {
    if (!user) return;
    await persist({
      ...user,
      username,
      displayName: username,
      dob,
      avatarColor,
      winRate: 62,
      points: user.points > 0 ? user.points : STARTING_BANKROLL,
      profileComplete: true,
    });
  };

  const updatePoints = async (delta: number) => {
    if (!user) return;
    await persist(applyBankruptcy(user, user.points + delta));
  };

  const recordWager = async (cost: number) => {
    if (!user) return;
    const updated = applyBankruptcy(user, user.points - cost);
    updated.previousWagers = user.previousWagers + 1;
    await persist(updated);
  };

  const claimDailyBonus = async (): Promise<boolean> => {
    if (!user) return false;
    const now = Date.now();
    if (now - user.lastDailyClaim < DAY_MS) return false;
    const updated = applyBankruptcy(user, user.points + DAILY_AMOUNT);
    updated.lastDailyClaim = now;
    await persist(updated);
    return true;
  };

  const claimBailout = async (): Promise<boolean> => {
    if (!user) return false;
    if (user.points > 0) return false;
    await persist(applyBankruptcy(user, user.points + BAILOUT_AMOUNT));
    return true;
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
        updatePoints,
        recordWager,
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
