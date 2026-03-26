import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnv =
  !supabaseUrl || !supabaseAnonKey || String(supabaseUrl).includes("your-project-ref");

export const supabaseConfigError = missingEnv
  ? "Supabase env is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel."
  : "";

export const isSupabaseReady = !missingEnv;

function createDisabledClient() {
  const fail = () => {
    throw new Error(supabaseConfigError);
  };

  // minimal chain used by this project
  const chain = {
    select: fail,
    insert: fail,
    update: fail,
    delete: fail,
    eq: fail,
    neq: fail,
    order: fail,
    single: fail,
    maybeSingle: fail
  };

  return {
    from: () => chain
  };
}

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDisabledClient();
