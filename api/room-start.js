import Pusher from 'pusher';
import { createClient } from '@supabase/supabase-js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { code, user_id, initial_state } = req.body;
  if (!code || !user_id) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase.from('rooms').select('*').eq('code', code).single();
  if (error || !room) return res.status(404).json({ error: 'Room not found' });
  if (room.host_id !== user_id) return res.status(403).json({ error: 'Only the host can start' });

  const players = JSON.parse(room.players);
  if (players.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });

  await supabase.from('rooms').update({
    status: 'playing',
    state: JSON.stringify(initial_state || {}),
  }).eq('code', code);

  await pusher.trigger('room-' + code, 'game-started', {
    players,
    initial_state: initial_state || {},
  });

  return res.status(200).json({ ok: true });
}
