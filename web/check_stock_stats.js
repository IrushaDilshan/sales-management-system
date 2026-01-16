
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.REACT_APP_SUPABASE_URL;
const supabaseKey = envConfig.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    console.log('Checking stock table...');

    // 1. Get total count
    const { count, error: countError } = await supabase
        .from('stock')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting stock:', countError);
    } else {
        console.log(`Total rows in 'stock' table: ${count}`);
    }

    // 2. Try to fetch first 5 rows to see if RLS allows reading anonymously (or we're using anon key effectively as a public user)
    // Note: If RLS is on and no policies for 'public', this will return empty list.
    const { data, error } = await supabase
        .from('stock')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching stock:', error);
    } else {
        console.log('Sample stock data:', data);
    }
}

checkStock();
