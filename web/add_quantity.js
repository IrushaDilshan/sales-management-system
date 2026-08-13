const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rrrrgdgeldkjrtovkhtt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycnJnZGdlbGRranJ0b3ZraHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc4MDksImV4cCI6MjA5OTQxMzgwOX0.SVqQqVOstl61hZKlzUeMolc9EQakvGI68PTn1Gy4yvM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;"
    });

    if (error) {
        console.error('RPC Error:', error);
        // Fallback if RPC doesn't exist
    } else {
        console.log('Added quantity column via RPC');
    }
}

run();
