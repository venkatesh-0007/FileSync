import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// We generate a hidden email to satisfy Supabase's email/password auth
const generateHiddenEmail = () => `user_${uuidv4()}@example.com`;

export const registerWithUsername = async (username: string, password: string) => {
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
  // Supabase doesn't easily let us query the auth.users table anonymously for a username.
  // Wait, if the user tries to login with a username, we don't know their hidden email!
  
  // To fix this without an insecure public users table:
  // We can try logging in via a Supabase Edge Function, OR simpler:
  // For this MVP, we will use a pseudo-email: `[username]@example.com`
  
  // Ah, actually, if we use `username@example.com` as the email, it solves the lookup problem!
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
