import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://quvqwamgicwhnwevbyzj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4GWRJFGdEgNhBmCb2aAhRQ_4oqmKN-V";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
