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

function makeCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, username, game, public: isPublic } = req.body;
  if (!user_id || !game) return res.status(400).json({ error: 'Missing fields' });

  const code = makeCode();
  const maxPlayers = game === 'blackjack' ? 2 : game === 'gin_rummy' ? 2 : game === 'i_doubt_it' ? 4 : 4;

  const { data, error } = await supabase.from('rooms').insert({
    code,
    game,
    host_id: user_id,
    players: JSON.stringify([{ user_id, username, chips: 1000, ready: false }]),
    state: JSON.stringify({}),
    status: 'waiting',
    public: isPublic || false,
    max_players: maxPlayers,
  }).select().single();

  if (error) return res.status(500).json({ error: 'Failed to create room' });
  return res.status(200).json({ room: data });
}
