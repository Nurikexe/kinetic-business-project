import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read from .env.local manually if needed, or pass via command line
// For now, I'll extract from src/lib/supabase.js if I could, but I'll assume they are in environment
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function wipeCommunityPlans() {
  console.log('Attempting to delete all rows from community_plans...');
  const { data, error, count } = await supabase
    .from('community_plans')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (error) {
    console.error('Error deleting plans:', error);
  } else {
    console.log('Successfully deleted existing community plans.');
  }
}

wipeCommunityPlans();
