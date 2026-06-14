import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  listPosts,
  createPost,
  getLeaderboard,
  getMemberLeaderboard,
  type Post as ApiPost,
  type LeaderboardEntry as ApiLeaderboardEntry,
} from "@workspace/api-client-react";

export interface Prediction {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  userVote?: "A" | "B";
  resolved?: boolean;
  result?: "A" | "B";
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  text: string;
  prediction?: Prediction;
  likes: number;
  liked: boolean;
  comments: number;
  createdAt: string;
}

export interface League {
  id: string;
  name: string;
  code: string;
  memberIds: string[];
  ownerId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  leagueId: string;
  userId: string;
  username: string;
  avatarColor: string;
  text: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
  rank: number;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toPost(api: ApiPost): Post {
  return {
    id: api.id,
    userId: api.userId,
    username: api.username,
    displayName: api.displayName,
    avatarColor: api.avatarColor,
    text: api.text,
    likes: 0,
    liked: false,
    comments: 0,
    createdAt: formatRelative(api.createdAt),
  };
}

function toLeaderboardEntry(api: ApiLeaderboardEntry): LeaderboardEntry {
  return {
    userId: api.userId,
    username: api.username,
    displayName: api.displayName,
    avatarColor: api.avatarColor,
    points: api.points,
    winRate: api.winRate,
    rank: api.rank,
  };
}

interface DataContextType {
  posts: Post[];
  leagues: League[];
  messages: Record<string, Message[]>;
  leaderboard: LeaderboardEntry[];
  addPost: (text: string) => void;
  likePost: (postId: string) => void;
  voteOnPrediction: (postId: string, choice: "A" | "B") => void;
  sendMessage: (leagueId: string, text: string) => void;
  createLeague: (name: string) => Promise<League | null>;
  joinLeague: (code: string) => Promise<boolean>;
  leaveLeague: (leagueId: string) => Promise<void>;
  refreshLeagues: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  fetchLeagueLeaderboard: (league: League) => Promise<LeaderboardEntry[]>;
  getUserStats: (userId: string) => { points: number; winRate: number } | null;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, joinGroup } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const refreshPosts = useCallback(async () => {
    try {
      const rows = await listPosts();
      setPosts(rows.map(toPost));
    } catch {
      setPosts([]);
    }
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const rows = await getLeaderboard();
      setLeaderboard(rows.map(toLeaderboardEntry));
    } catch {
      setLeaderboard([]);
    }
  }, []);

  const refreshLeagues = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/leagues/${user.id}`);
      if (res.ok) setLeagues(await res.json());
    } catch (e) {
      console.error("Fetch leagues error:", e);
    }
  }, [user]);

  useEffect(() => {
    refreshPosts();
    refreshLeaderboard();
    refreshLeagues();
    AsyncStorage.getItem("huddle_messages").then((raw) => {
      setMessages(raw ? JSON.parse(raw) : {});
    });
  }, [refreshPosts, refreshLeaderboard, refreshLeagues]);

  const saveMessages = (next: Record<string, Message[]>) => {
    setMessages(next);
    AsyncStorage.setItem("huddle_messages", JSON.stringify(next));
  };

  const addPost = async (text: string) => {
    if (!user || !text.trim()) return;
    try {
      await createPost({ userId: user.id, text: text.trim() });
      await refreshPosts();
    } catch {
      // Leave the feed unchanged if the post fails to save.
    }
  };

  const likePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  const voteOnPrediction = (postId: string, choice: "A" | "B") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || !p.prediction) return p;
        const pred = p.prediction;
        if (pred.userVote) return p;
        return {
          ...p,
          prediction: {
            ...pred,
            userVote: choice,
            votesA: choice === "A" ? pred.votesA + 1 : pred.votesA,
            votesB: choice === "B" ? pred.votesB + 1 : pred.votesB,
          },
        };
      })
    );
  };

  const sendMessage = (leagueId: string, text: string) => {
    if (!user) return;
    const msg: Message = {
      id: generateId(),
      leagueId,
      userId: user.id,
      username: user.username || "me",
      avatarColor: user.avatarColor,
      text,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const next = { ...messages, [leagueId]: [...(messages[leagueId] || []), msg] };
    saveMessages(next);
  };

  const createLeague = async (name: string): Promise<League | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/leagues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userId: user.id }),
      });
      if (!res.ok) return null;
      const newLeague = await res.json();
      setLeagues((prev) => [...prev, newLeague]);
      joinGroup(newLeague.id);
      return newLeague;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const joinLeague = async (code: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/leagues/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId: user.id }),
      });
      if (!res.ok) return false;
      await refreshLeagues();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const leaveLeague = async (leagueId: string) => {
    if (!user) return;
    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/leagues/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, userId: user.id }),
      });
      setLeagues((prev) => prev.filter((l) => l.id !== leagueId));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeagueLeaderboard = useCallback(
    async (league: League): Promise<LeaderboardEntry[]> => {
      const ids = Array.from(new Set(league.memberIds));
      if (ids.length === 0) return [];
      try {
        const rows = await getMemberLeaderboard({ userIds: ids });
        return rows.map(toLeaderboardEntry);
      } catch {
        return [];
      }
    },
    [],
  );

  const getUserStats = (userId: string): { points: number; winRate: number } | null => {
    const entry = leaderboard.find((e) => e.userId === userId);
    if (!entry) return null;
    return { points: entry.points, winRate: entry.winRate };
  };

  return (
    <DataContext.Provider value={{ posts, leagues, messages, leaderboard, addPost, likePost, voteOnPrediction, sendMessage, createLeague, joinLeague, leaveLeague, refreshLeagues, refreshLeaderboard, fetchLeagueLeaderboard, getUserStats }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}