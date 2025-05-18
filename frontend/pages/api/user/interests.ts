import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.headers['x-user-id']; // (JWT'den ya da cookie'den alınmalı)

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('user_interests')
    .select('topic')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(data.map((d) => d.topic));
} 