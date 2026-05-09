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
  profileComplete: boolean;
}

interface AuthContextType {
  user: HuddleUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  completeProfile: (username: string, dob: string, avatarColor: string) => Promise<void>;
  updatePoints: (delta: number) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AVATAR_COLORS = ["#E8533A", "#3A7DE8", "#3AE86A", "#E8C83A", "#9B3AE8", "#E83A8C", "#3AE8D4"];

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const STORAGE_KEY = "huddle_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<HuddleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setUser(JSON.parse(raw));
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
      setUser(JSON.parse(raw));
      return;
    }
    const newUser: HuddleUser = {
      id: generateId(),
      email,
      username: "",
      displayName: "",
      dob: "",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      winRate: 0,
      points: 1000,
      profileComplete: false,
    };
    await persist(newUser);
  };

  const register = async (email: string, _password: string) => {
    const newUser: HuddleUser = {
      id: generateId(),
      email,
      username: "",
      displayName: "",
      dob: "",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      winRate: 0,
      points: 1000,
      profileComplete: false,
    };
    await persist(newUser);
  };

  const completeProfile = async (username: string, dob: string, avatarColor: string) => {
    if (!user) return;
    const updated: HuddleUser = {
      ...user,
      username,
      displayName: username,
      dob,
      avatarColor,
      winRate: 62,
      points: user.points > 0 ? user.points : 1000,
      profileComplete: true,
    };
    await persist(updated);
  };

  const updatePoints = async (delta: number) => {
    if (!user) return;
    const updated: HuddleUser = { ...user, points: Math.max(0, user.points + delta) };
    await persist(updated);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, completeProfile, updatePoints, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
