import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

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

export interface Callout {
  targetUserId: string;
  targetUsername: string;
  amount: number;
  status: "pending" | "accepted" | "declined";
  pot?: number;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  text: string;
  prediction?: Prediction;
  callout?: Callout;
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

const SEED_POSTS: Post[] = [
  {
    id: "p0",
    userId: "u3",
    username: "tomaszwiecek",
    displayName: "Tomasz Wiecek",
    avatarColor: "#9B3AE8",
    text: "Bet you haven't got the bottle. 750 points says City keep a clean sheet this weekend.",
    callout: {
      targetUserId: "me",
      targetUsername: "me",
      amount: 750,
      status: "pending",
    },
    likes: 12,
    liked: false,
    comments: 5,
    createdAt: "1h",
  },
  {
    id: "p1",
    userId: "u1",
    username: "kingsleyobi",
    displayName: "Kingsley Obi",
    avatarColor: "#E8533A",
    text: "No way Arsenal hold on today lads. City are on another level rn 💀",
    prediction: {
      id: "pred1",
      question: "Will Arsenal beat Man City at the Etihad?",
      optionA: "Yes, Arsenal win",
      optionB: "No, City win",
      votesA: 142,
      votesB: 381,
    },
    likes: 48,
    liked: false,
    comments: 23,
    createdAt: "2h",
  },
  {
    id: "p2",
    userId: "u2",
    username: "sarahchidi",
    displayName: "Sarah Chidi",
    avatarColor: "#3A7DE8",
    text: "Curry is cooking tonight, putting every point I have on this one 🔥",
    prediction: {
      id: "pred2",
      question: "Will Steph Curry score 35+ points vs the Lakers?",
      optionA: "Yes, 35+",
      optionB: "No, under 35",
      votesA: 267,
      votesB: 189,
    },
    likes: 91,
    liked: false,
    comments: 41,
    createdAt: "4h",
  },
  {
    id: "p3",
    userId: "u3",
    username: "tomaszwiecek",
    displayName: "Tomasz Wiecek",
    avatarColor: "#9B3AE8",
    text: "Mbappé hasn't looked himself since the move. Respectfully disagree with anyone who says otherwise.",
    prediction: {
      id: "pred3",
      question: "Will Mbappé score vs Atletico in the derby?",
      optionA: "Goals for Kylian",
      optionB: "Blanks again",
      votesA: 412,
      votesB: 208,
    },
    likes: 134,
    liked: false,
    comments: 67,
    createdAt: "6h",
  },
  {
    id: "p4",
    userId: "u4",
    username: "ameliavoss",
    displayName: "Amelia Voss",
    avatarColor: "#3AE86A",
    text: "Respectfully, the Ashes is the greatest series in sport. Change my mind.",
    prediction: {
      id: "pred4",
      question: "Will England win the first Ashes Test?",
      optionA: "England take it",
      optionB: "Australia hold",
      votesA: 198,
      votesB: 321,
    },
    likes: 77,
    liked: false,
    comments: 29,
    createdAt: "8h",
  },
  {
    id: "p5",
    userId: "u5",
    username: "joshadeleke",
    displayName: "Josh Adeleke",
    avatarColor: "#E8C83A",
    text: "PSG are overrated every single season and every year the timeline pretends to be surprised 😭",
    likes: 203,
    liked: false,
    comments: 88,
    createdAt: "10h",
  },
  {
    id: "p6",
    userId: "u1",
    username: "kingsleyobi",
    displayName: "Kingsley Obi",
    avatarColor: "#E8533A",
    text: "Novak at 37 is still the most complete player on any surface. Wild.",
    prediction: {
      id: "pred5",
      question: "Will Djokovic win his next Grand Slam?",
      optionA: "One more title",
      optionB: "His era is over",
      votesA: 534,
      votesB: 312,
    },
    likes: 156,
    liked: false,
    comments: 54,
    createdAt: "12h",
  },
];

const SEED_LEAGUES: League[] = [
  {
    id: "l1",
    name: "KCL Banter FC",
    code: "KCL2024",
    memberIds: ["u1", "u2", "u3", "me"],
    ownerId: "u1",
    createdAt: "2024-01-10",
  },
  {
    id: "l2",
    name: "Housemates Huddle",
    code: "HOUSE99",
    memberIds: ["u2", "u4", "me"],
    ownerId: "me",
    createdAt: "2024-02-01",
  },
];

const SEED_MESSAGES: Record<string, Message[]> = {
  l1: [
    { id: "m1", leagueId: "l1", userId: "u1", username: "kingsleyobi", avatarColor: "#E8533A", text: "Who's putting points on the Arsenal match tonight?", createdAt: "2:15 PM" },
    { id: "m2", leagueId: "l1", userId: "u2", username: "sarahchidi", avatarColor: "#3A7DE8", text: "I already voted. City all day, no cap", createdAt: "2:17 PM" },
    { id: "m3", leagueId: "l1", userId: "u3", username: "tomaszwiecek", avatarColor: "#9B3AE8", text: "Same lol. Arsenal have been shaky for weeks", createdAt: "2:19 PM" },
    { id: "m4", leagueId: "l1", userId: "u1", username: "kingsleyobi", avatarColor: "#E8533A", text: "Fair enough. I'm riding with Arsenal though. They need the points", createdAt: "2:22 PM" },
  ],
  l2: [
    { id: "m5", leagueId: "l2", userId: "u4", username: "ameliavoss", avatarColor: "#3AE86A", text: "Can someone explain the Ashes format again lol", createdAt: "Yesterday" },
    { id: "m6", leagueId: "l2", userId: "me", username: "me", avatarColor: "#E8C83A", text: "It's 5 tests, first to 3 series wins basically", createdAt: "Yesterday" },
    { id: "m7", leagueId: "l2", userId: "u4", username: "ameliavoss", avatarColor: "#3AE86A", text: "Okay makes sense. I voted England to win", createdAt: "Yesterday" },
  ],
};

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { userId: "u3", username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8", points: 4820, winRate: 74, rank: 1 },
  { userId: "u1", username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A", points: 3910, winRate: 68, rank: 2 },
  { userId: "u5", username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A", points: 3640, winRate: 65, rank: 3 },
  { userId: "u2", username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8", points: 2890, winRate: 61, rank: 4 },
  { userId: "u4", username: "ameliavoss", displayName: "Amelia Voss", avatarColor: "#3AE86A", points: 2210, winRate: 58, rank: 5 },
  { userId: "u6", username: "mikeokoro", displayName: "Mike Okoro", avatarColor: "#E83A8C", points: 1980, winRate: 55, rank: 6 },
  { userId: "u7", username: "priyapatel", displayName: "Priya Patel", avatarColor: "#3AE8D4", points: 1740, winRate: 52, rank: 7 },
  { userId: "u8", username: "lucabianchi", displayName: "Luca Bianchi", avatarColor: "#E8533A", points: 1520, winRate: 49, rank: 8 },
];

interface DataContextType {
  posts: Post[];
  leagues: League[];
  messages: Record<string, Message[]>;
  leaderboard: LeaderboardEntry[];
  addPost: (text: string) => void;
  respondToCallout: (postId: string, accept: boolean) => void;
  likePost: (postId: string) => void;
  voteOnPrediction: (postId: string, choice: "A" | "B") => void;
  sendMessage: (leagueId: string, text: string) => void;
  createLeague: (name: string) => League;
  joinLeague: (code: string) => boolean;
  getLeagueLeaderboard: (league: League) => LeaderboardEntry[];
  getUserStats: (userId: string) => { points: number; winRate: number } | null;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, joinGroup, updatePoints } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("huddle_posts_v2").then((raw) => {
      setPosts(raw ? JSON.parse(raw) : SEED_POSTS);
    });
    AsyncStorage.getItem("huddle_leagues").then((raw) => {
      setLeagues(raw ? JSON.parse(raw) : SEED_LEAGUES);
    });
    AsyncStorage.getItem("huddle_messages").then((raw) => {
      setMessages(raw ? JSON.parse(raw) : SEED_MESSAGES);
    });
    setLeaderboard(SEED_LEADERBOARD);
  }, []);

  const savePosts = (next: Post[]) => {
    setPosts(next);
    AsyncStorage.setItem("huddle_posts_v2", JSON.stringify(next));
  };
  const saveLeagues = (next: League[]) => {
    setLeagues(next);
    AsyncStorage.setItem("huddle_leagues", JSON.stringify(next));
  };
  const saveMessages = (next: Record<string, Message[]>) => {
    setMessages(next);
    AsyncStorage.setItem("huddle_messages", JSON.stringify(next));
  };

  const parseCallout = (text: string): Callout | undefined => {
    const mention = text.match(/@(\w+)/);
    const num = text.match(/\b(\d+)\b/);
    if (!mention || !num) return undefined;
    const amount = parseInt(num[1], 10);
    if (!amount || amount <= 0) return undefined;
    const targetUsername = mention[1];
    const target = SEED_LEADERBOARD.find(
      (e) => e.username.toLowerCase() === targetUsername.toLowerCase()
    );
    return {
      targetUserId: target?.userId ?? "",
      targetUsername,
      amount,
      status: "pending",
    };
  };

  const addPost = (text: string) => {
    if (!user || !text.trim()) return;
    const post: Post = {
      id: generateId(),
      userId: user.id,
      username: user.username || "me",
      displayName: user.displayName || "You",
      avatarColor: user.avatarColor,
      text: text.trim(),
      callout: parseCallout(text),
      likes: 0,
      liked: false,
      comments: 0,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    savePosts([post, ...posts]);
  };

  const respondToCallout = (postId: string, accept: boolean) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.callout || post.callout.status !== "pending") return;
    const callout = post.callout;
    const isTarget =
      !!user && (callout.targetUserId === user.id || callout.targetUserId === "me");
    if (!isTarget) return;

    if (accept) {
      if ((user?.points ?? 0) < callout.amount) return;
      updatePoints(-callout.amount);
      savePosts(
        posts.map((p) =>
          p.id === postId && p.callout && p.callout.status === "pending"
            ? { ...p, callout: { ...p.callout, status: "accepted", pot: callout.amount * 2 } }
            : p
        )
      );
    } else {
      savePosts(
        posts.map((p) =>
          p.id === postId && p.callout && p.callout.status === "pending"
            ? { ...p, callout: { ...p.callout, status: "declined" } }
            : p
        )
      );
    }
  };

  const likePost = (postId: string) => {
    savePosts(
      posts.map((p) =>
        p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  const voteOnPrediction = (postId: string, choice: "A" | "B") => {
    savePosts(
      posts.map((p) => {
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

  const getLeagueLeaderboard = (league: League): LeaderboardEntry[] => {
    const seen = new Set<string>();
    const entries: LeaderboardEntry[] = [];
    league.memberIds.forEach((mid) => {
      const isMe = user && (mid === user.id || mid === "me");
      if (isMe && user) {
        if (seen.has(user.id)) return;
        seen.add(user.id);
        entries.push({
          userId: user.id,
          username: user.username || "me",
          displayName: user.displayName || "You",
          avatarColor: user.avatarColor,
          points: user.points,
          winRate: user.winRate,
          rank: 0,
        });
      } else {
        if (seen.has(mid)) return;
        const seed = leaderboard.find((e) => e.userId === mid);
        if (seed) {
          seen.add(mid);
          entries.push({ ...seed });
        }
      }
    });
    return entries
      .sort((a, b) => b.points - a.points)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  };

  const getUserStats = (userId: string): { points: number; winRate: number } | null => {
    const entry = leaderboard.find((e) => e.userId === userId);
    if (!entry) return null;
    return { points: entry.points, winRate: entry.winRate };
  };

  return (
    <DataContext.Provider value={{ posts, leagues, messages, leaderboard, addPost, respondToCallout, likePost, voteOnPrediction, sendMessage, createLeague, joinLeague, getLeagueLeaderboard, getUserStats }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
