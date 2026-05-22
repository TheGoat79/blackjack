export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    pusherKey: process.env.PUSHER_KEY,
    pusherCluster: process.env.PUSHER_CLUSTER,
  });
}
