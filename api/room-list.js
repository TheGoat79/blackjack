import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('rooms')
    .select('code, game, players, max_players, status, public')
    .eq('public', true)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: 'Failed to fetch rooms' });

  const rooms = data.map(r => ({
    ...r,
    players: JSON.parse(r.players || '[]'),
  }));

  return res.status(200).json({ rooms });
}
