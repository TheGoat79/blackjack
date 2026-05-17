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

  // Find user
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, chips, password_hash')
    .eq('username', username)
    .single();

  if (error || !user) return res.status(401).json({ error: 'Invalid username or password' });

  // Check password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

  return res.status(200).json({
    user: { id: user.id, username: user.username, chips: user.chips }
  });
}
