import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcbiuaskauyqkmsrbbcf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rWPqR5KxyJRx00AMK3YImg_exUARu0q";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
