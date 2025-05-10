import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { token, title, body } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing FCM token' });

  try {
    const message = {
      notification: { title, body },
      token,
    };
    const response = await admin.messaging().send(message);
    res.status(200).json({ message: 'Notification sent', response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 