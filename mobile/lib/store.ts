import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

export interface Profile {
  id: string;
  email: string;
  company_name: string | null;
  company_url: string | null;
  plan_tier: string;
}

interface AppState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  notificationToken: string | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setNotificationToken: (token: string | null) => void;
  clearUser: () => void;
}

export const useStore = create<AppState>((set) => ({
  session: null,
  user: null,
  profile: null,
  notificationToken: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setNotificationToken: (token) => set({ notificationToken: token }),
  clearUser: () =>
    set({ session: null, user: null, profile: null }),
}));
