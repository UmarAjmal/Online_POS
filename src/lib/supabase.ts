import { createClient } from "@supabase/supabase-js";
import { mockSupabase } from "./supabaseMock";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  !supabaseUrl ||
  !supabaseAnonKey;

export const supabase = useMock
  ? (mockSupabase as any)
  : createClient(supabaseUrl, supabaseAnonKey);
