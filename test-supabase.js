import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testWrite() {
  const { data, error } = await supabase
    .from('products')
    .insert([{ name: 'Codex Test Item', price: 500, category: 'Testing' }])
    .select();

  if (error) console.error('Write failed:', error);
  else console.log('Write successful:', data);
}

testWrite();
