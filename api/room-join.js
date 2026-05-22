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
  const { code, user_id, username } = req.body;
  if (!code || !user_id) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).single();
  if (error || !room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'waiting') return res.status(400).json({ error: 'Game already started' });

  const players = JSON.parse(room.players);
  if (players.find(p => p.user_id === user_id)) return res.status(200).json({ room });
  if (players.length >= room.max_players) return res.status(400).json({ error: 'Room is full' });

  players.push({ user_id, username, chips: 1000, ready: false });

  const { data: updated, error: updateError } = await supabase
    .from('rooms').update({ players: JSON.stringify(players) })
    .eq('code', code.toUpperCase()).select().single();

  if (updateError) return res.status(500).json({ error: 'Failed to join room' });

  await pusher.trigger('room-' + code.toUpperCase(), 'player-joined', {
    players,
    username,
  });

  return res.status(200).json({ room: updated });
}
