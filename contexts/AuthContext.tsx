import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { User } from "../types";

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Sign up the user (email confirmation disabled in Supabase settings)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pass full_name in metadata for database trigger
        data: {
          full_name: fullName || "",
        },
        // Skip email confirmation - user is automatically confirmed
        emailRedirectTo: undefined,
      },
    });

    if (authError) return { error: authError };

    // If user was created, ensure profile exists and auto-sign in
    if (authData.user) {
      // Create or update user profile (trigger might have created it, but ensure full_name is set)
      const { error: profileError } = await supabase.from("users").upsert(
        [
          {
            id: authData.user.id,
            email: authData.user.email,
            full_name: fullName || null,
          },
        ],
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't fail signup if profile creation fails - trigger might have handled it
      }

      // Auto-sign in the user immediately after signup
      // This ensures they're logged in right away (one-time signup experience)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If auto-signin fails, the user is still created, just need to sign in manually
        console.warn(
          "Auto-signin failed, user should sign in manually:",
          signInError
        );
        return { error: null }; // Don't fail signup, user can sign in
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (error) throw error;
    await fetchUserProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
