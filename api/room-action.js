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
  const { code, user_id, action, payload } = req.body;
  if (!code || !user_id || !action) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase.from('rooms').select('*').eq('code', code).single();
  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  const state = JSON.parse(room.state || '{}');
  const players = JSON.parse(room.players || '[]');

  // Broadcast the action to all players in the room
  await pusher.trigger('room-' + code, 'game-action', {
    user_id,
    action,
    payload,
    state,
    players,
  });

  // Update state if provided
  if (payload?.state) {
    await supabase.from('rooms').update({ state: JSON.stringify(payload.state) }).eq('code', code);
  }

  return res.status(200).json({ ok: true });
}
