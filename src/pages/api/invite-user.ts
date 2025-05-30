// pages/api/invite-user.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, role, company_id } = req.body;
  if (!email || !role || !company_id) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // 1. Invite user via Supabase Auth
    const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      return res.status(400).json({ error: inviteError.message });
    }
    if (!data || !data.user) {
      return res.status(500).json({ error: 'Failed to create auth user.' });
    }

    // 2. Insert into your users table
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      role,
      company_id,
    });
    if (insertError) {
      return res.status(500).json({ error: 'Failed to add user to database.' });
    }

    return res.status(200).json({ user: data.user });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}