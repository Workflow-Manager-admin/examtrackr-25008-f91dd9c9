import { createClient } from '@supabase/supabase-js';

// PUBLIC_INTERFACE
export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "<your-supabase-url>",
  process.env.REACT_APP_SUPABASE_ANON_KEY || "<your-supabase-anon-key>"
);
