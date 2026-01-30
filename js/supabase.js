// js/supabase.js  (COMPLETE FILE)

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// js/supabase.js
const SUPABASE_URL = "https://quvqwamgicwhnwevbyzj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4GWRJFGdEgNhBmCb2aAhRQ_4oqmKN-V";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
