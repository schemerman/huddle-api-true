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

// Ids of leagues that were previously seeded as mock data. Existing installs
// may still have these cached in AsyncStorage, so we purge them once.
const LEGACY_SEED_LEAGUE_IDS = ["l1", "l2"];

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
  createLeague: (name: string) => League;
  joinLeague: (code: string) => boolean;
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

  useEffect(() => {
    refreshPosts();
    refreshLeaderboard();
    AsyncStorage.getItem("huddle_seed_purged").then((purged) => {
      AsyncStorage.getItem("huddle_leagues").then((raw) => {
        let parsed: League[] = raw ? JSON.parse(raw) : [];
        if (!purged) {
          parsed = parsed.filter((l) => !LEGACY_SEED_LEAGUE_IDS.includes(l.id));
          AsyncStorage.setItem("huddle_leagues", JSON.stringify(parsed));
        }
        setLeagues(parsed);
      });
      AsyncStorage.getItem("huddle_messages").then((raw) => {
        const parsed: Record<string, Message[]> = raw ? JSON.parse(raw) : {};
        if (!purged) {
          LEGACY_SEED_LEAGUE_IDS.forEach((id) => delete parsed[id]);
          AsyncStorage.setItem("huddle_messages", JSON.stringify(parsed));
        }
        setMessages(parsed);
      });
      if (!purged) AsyncStorage.setItem("huddle_seed_purged", "1");
    });
  }, [refreshPosts, refreshLeaderboard]);

  const saveLeagues = (next: League[]) => {
    setLeagues(next);
    AsyncStorage.setItem("huddle_leagues", JSON.stringify(next));
  };
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

  const createLeague = (name: string): League => {
    if (!user) throw new Error("Not authenticated");
    const code = name.replace(/\s/g, "").toUpperCase().substring(0, 6) + Math.floor(Math.random() * 99);
    const league: League = {
      id: generateId(),
      name,
      code,
      memberIds: [user.id],
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    };
    saveLeagues([...leagues, league]);
    joinGroup(league.id);
    return league;
  };

  const joinLeague = (code: string): boolean => {
    if (!user) return false;
    const idx = leagues.findIndex((l) => l.code === code);
    if (idx === -1) return false;
    const league = leagues[idx];
    joinGroup(league.id);
    if (league.memberIds.includes(user.id)) return true;
    const updated = { ...league, memberIds: [...league.memberIds, user.id] };
    const next = [...leagues];
    next[idx] = updated;
    saveLeagues(next);
    return true;
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
    <DataContext.Provider value={{ posts, leagues, messages, leaderboard, addPost, likePost, voteOnPrediction, sendMessage, createLeague, joinLeague, refreshLeaderboard, fetchLeagueLeaderboard, getUserStats }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
