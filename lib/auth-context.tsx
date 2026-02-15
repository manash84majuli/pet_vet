/**
 * Auth Context Provider
 * Manages authentication state and user session
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { logoutUser, signUpWithProfile } from "@/actions/auth";
import { createBrowserClient } from "@/lib/supabase";
import { Profile } from "@/lib/types";

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache keys for localStorage
const CACHED_PROFILE_KEY = "vet_pet_cached_profile";

function getCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHED_PROFILE_KEY);
    if (cached) return JSON.parse(cached) as Profile;
  } catch {}
  return null;
}

function setCachedProfile(profile: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile) {
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(CACHED_PROFILE_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cache so role-based UI renders immediately
  const [user, setUserState] = useState<Profile | null>(() => getCachedProfile());
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createBrowserClient(), []);

  // Wrapper that also persists to localStorage
  const setUser = useCallback((profile: Profile | null) => {
    setCachedProfile(profile);
    setUserState(profile);
  }, []);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.error("Profile fetch failed:", error);
        return null;
      }

      // The data from a .single() call is the row object itself.
      // The type assertion is safe because RLS ensures we can only fetch the user's own profile.
      return data as unknown as Profile;
    },
    [supabase]
  );

  useEffect(() => {
    // Set initial loading state
    setIsLoading(true);

    // Let onAuthStateChange be the single source of truth.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] onAuthStateChange event: ${event}`);
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        console.log(`[Auth] Profile loaded, role: ${profile?.role}`);
        setUser(profile);
      } else {
        console.log("[Auth] No session, user set to null.");
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      console.log("[Auth] Unsubscribing from auth changes.");
      subscription.unsubscribe();
    };
  }, [loadProfile, setUser, supabase]);


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const authUser = data.user;
      if (!authUser) {
        throw new Error("Login failed. No user returned.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Login did not create a session. Please try again.");
      }

      const profile = await loadProfile(authUser.id);
      if (!profile) {
        throw new Error("Profile not found. Please complete signup.");
      }

      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address?: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await signUpWithProfile({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
      });

      if (!result.success) {
        throw new Error(result.message || "Signup failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const result = await logoutUser();
      if (!result.success) {
        console.warn("Server logout failed:", result.message);
      }

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          throw error;
        }
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
