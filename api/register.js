import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Check if username already taken
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (existing) return res.status(409).json({ error: 'Username already taken' });

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create user
  const { data, error } = await supabase
    .from('users')
    .insert({ username, password_hash, chips: 1000 })
    .select('id, username, chips')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create account' });

  return res.status(200).json({ user: data });
}
