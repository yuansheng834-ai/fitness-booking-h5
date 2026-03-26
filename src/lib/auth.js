import { supabase } from "./supabase";

const STORAGE_KEY = "fitness_h5_current_user";

export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function roleToPortalPath(role) {
  if (role === "admin") return "/portal/admin";
  if (role === "coach") return "/portal/coach";
  return "/portal/member";
}

export async function ensureDefaultAdmin() {
  const username = "sy1120a";
  const { data: existed, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (checkError) {
    throw new Error(checkError.message || "Failed to check default admin");
  }

  if (existed) return;

  const { error: insertError } = await supabase.from("users").insert({
    username,
    password_hash: "520syhh4043",
    nickname: "System Admin",
    role: "admin",
    available_credits: 0
  });

  if (insertError) {
    throw new Error(insertError.message || "Failed to initialize default admin");
  }
}

export async function registerMember({ username, password, nickname }) {
  const safeUsername = String(username || "").trim();
  const safePassword = String(password || "").trim();
  const safeNickname = String(nickname || "").trim();

  if (!safeUsername || !safePassword || !safeNickname) {
    throw new Error("Username, password and nickname are required");
  }

  const { data: existed, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("username", safeUsername)
    .maybeSingle();

  if (checkError) {
    throw new Error(checkError.message || "Failed to check account");
  }

  if (existed) {
    throw new Error("Username already exists");
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      username: safeUsername,
      password_hash: safePassword,
      nickname: safeNickname,
      role: "member",
      available_credits: 0
    })
    .select("id, username, nickname, role, available_credits")
    .single();

  if (error) {
    throw new Error(error.message || "Register failed");
  }

  return data;
}

export async function loginWithPassword({ username, password }) {
  const safeUsername = String(username || "").trim();
  const safePassword = String(password || "").trim();

  if (!safeUsername || !safePassword) {
    throw new Error("Username and password are required");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, username, nickname, role, available_credits")
    .eq("username", safeUsername)
    .eq("password_hash", safePassword)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Login failed");
  }

  if (!data) {
    throw new Error("Invalid username or password");
  }

  return data;
}
