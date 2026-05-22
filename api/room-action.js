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

  const state = JSON.parse(room.state || '{}');
  const players = JSON.parse(room.players || '[]');

  // Only the host can deal/advance game state
  const isHost = room.host_id === user_id;

  switch (action) {
    case 'deal': {
      if (!isHost) return res.status(403).json({ error: 'Only host can deal' });
      // State is sent from host, contains public info
      await supabase.from('rooms').update({ state: JSON.stringify(payload.publicState) }).eq('code', code);
      // Broadcast public state to everyone
      await pusher.trigger('room-' + code, 'poker-state', { state: payload.publicState });
      // Send private hole cards to each player individually
      if (payload.privateCards) {
        for (const [uid, cards] of Object.entries(payload.privateCards)) {
          await pusher.trigger('room-' + code, 'poker-hole-' + uid, { cards });
        }
      }
      break;
    }
    case 'player-action': {
      // Broadcast player action to all (fold, check, call, raise)
      await pusher.trigger('room-' + code, 'poker-action', {
        user_id,
        action: payload.action,
        amount: payload.amount,
        username: payload.username,
      });
      break;
    }
    case 'state-update': {
      if (!isHost) return res.status(403).json({ error: 'Only host can update state' });
      await supabase.from('rooms').update({ state: JSON.stringify(payload.state) }).eq('code', code);
      await pusher.trigger('room-' + code, 'poker-state', { state: payload.state });
      break;
    }
    case 'showdown': {
      if (!isHost) return res.status(403).json({ error: 'Only host can trigger showdown' });
      await pusher.trigger('room-' + code, 'poker-showdown', payload);
      break;
    }
    case 'chat': {
      await pusher.trigger('room-' + code, 'chat', {
        username: payload.username,
        message: payload.message,
      });
      break;
    }
  }

  return res.status(200).json({ ok: true });
}
