import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, chips, game, result, chips_change } = req.body;
  if (!user_id || chips === undefined) return res.status(400).json({ error: 'Missing fields' });

  // Update chips
  const { error: updateError } = await supabase
    .from('users')
    .update({ chips })
    .eq('id', user_id);

  if (updateError) return res.status(500).json({ error: 'Failed to update chips' });

  // Log score history
  if (game && result && chips_change !== undefined) {
    await supabase.from('scores').insert({ user_id, game, result, chips_change });
  }

  return res.status(200).json({ success: true });
}
