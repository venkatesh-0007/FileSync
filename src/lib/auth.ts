import { supabase, isSupabaseConfigured } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// We generate a hidden email to satisfy Supabase's email/password auth
const generateHiddenEmail = () => `user_${uuidv4()}@example.com`;

const ensureConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase environment variables are missing. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Project Settings > Environment Variables, then redeploy."
    );
  }
};

export const registerWithUsername = async (username: string, password: string) => {
  ensureConfigured();
  const hiddenEmail = generateHiddenEmail();

  // Supabase Auth allows storing custom metadata on signup
  const { data, error } = await supabase.auth.signUp({
    email: hiddenEmail,
    password,
    options: {
      data: {
        username: username,
      },
    },
  });

  if (error) throw error;
  return data.user;
};

export const loginWithUsername = async (username: string, password: string) => {
  ensureConfigured();
  const pseudoEmail = `${username}@example.com`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: pseudoEmail,
    password,
  });

  if (error) throw error;
  return data.user;
};

// Update register to use the deterministic pseudo-email
export const registerWithUsernameDeterministic = async (username: string, password: string) => {
  ensureConfigured();
  const pseudoEmail = `${username}@example.com`;

  const { data, error } = await supabase.auth.signUp({
    email: pseudoEmail,
    password,
    options: {
      data: {
        username: username,
      },
    },
  });

  if (error) throw error;
  return data.user;
};

export const logoutUser = async () => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
