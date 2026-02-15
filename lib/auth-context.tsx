/**
 * Auth Context Provider
 * Manages authentication state and user session
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { logoutUser, signUpWithProfile } from "@/actions/auth";
import { Database } from "@/lib/database.types";
import { createBrowserClient } from "@/lib/supabase";
import { Profile, UserRole } from "@/lib/types";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createBrowserClient(), []);

  const mapProfile = useCallback(
    (data: Database["public"]["Tables"]["profiles"]["Row"]): Profile => ({
    id: data.id,
    role: data.role as UserRole,
    full_name: data.full_name,
    phone: data.phone,
    city: data.city ?? undefined,
    state: data.state ?? undefined,
    avatar_url: data.avatar_url ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    }),
    []
  );

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

      return mapProfile(data);
    },
    [mapProfile, supabase]
  );

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (error || !authUser) {
          setUser(null);
          return;
        }

        const profile = await loadProfile(authUser.id);
        setUser(profile);
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — already handled by checkAuth above
      if (event === "INITIAL_SESSION") return;

      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // For TOKEN_REFRESHED, don't reset loading — user data is still valid
      // Only set loading for actual sign-in/sign-out events
      if (event === "SIGNED_IN") {
        setIsLoading(true);
      }

      try {
        const profile = await loadProfile(session.user.id);
        setUser(profile);
      } finally {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

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
