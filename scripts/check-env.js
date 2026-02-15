// scripts/check-env.js

// 1. Add this line at the very top to load variables from .env.local
require('dotenv').config({ path: '.env.local' });

const required = [
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  console.error('Missing required environment variables for DB operations:', missing.join(', '));
  console.error('Create a `.env.local` with these values before running migration commands.');
  process.exit(1);
}

console.log('Environment looks good for DB operations.');