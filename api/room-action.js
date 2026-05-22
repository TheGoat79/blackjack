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

  const { data: room, error } = await supabase
    .from('rooms').select('*').eq('code', code).single();
  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  // Handle chat separately — broadcast directly
  if (action === 'chat') {
    await pusher.trigger('room-' + code, 'chat', {
      username: payload.username,
      message: payload.message,
    });
    return res.status(200).json({ ok: true });
  }

  // Handle game state updates
  if (payload?.state) {
    await supabase.from('rooms')
      .update({ state: JSON.stringify(payload.state) })
      .eq('code', code);
  }

  // Broadcast game action to all players
  await pusher.trigger('room-' + code, 'game-action', {
    user_id,
    action,
    payload,
  });

  return res.status(200).json({ ok: true });
}
