jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => 'SUPABASE_CLIENT_INSTANCE')
}));

describe('supabaseClient.js', () => {
  it('should create Supabase client with env vars or fallback', () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://fake.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key-fake';
    // Re-require to ensure fresh import with env applied
    jest.resetModules();
    const { supabase } = require('./supabaseClient');
    const { createClient } = require('@supabase/supabase-js');
    expect(createClient).toHaveBeenCalledWith('https://fake.supabase.co', 'anon-key-fake');
    expect(supabase).toBe('SUPABASE_CLIENT_INSTANCE');
  });

  it('falls back to default strings if env vars are not set', () => {
    process.env.REACT_APP_SUPABASE_URL = "";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "";
    jest.resetModules();
    const { supabase } = require('./supabaseClient');
    const { createClient } = require('@supabase/supabase-js');
    expect(createClient).toHaveBeenCalledWith("<your-supabase-url>", "<your-supabase-anon-key>");
    expect(supabase).toBe("SUPABASE_CLIENT_INSTANCE");
  });
});
