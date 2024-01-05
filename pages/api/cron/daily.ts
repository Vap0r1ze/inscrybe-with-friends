import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/server/db';
import { redis } from '@/server/kv';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const authHeader = request.headers.authorization ?? '';
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return response.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const settled = await Promise.allSettled([
        prisma.user.count(),
        redis.set('cron:ping', Date.now()),
    ]);

    response.status(200).json({
        success: settled.every((result) => result.status === 'fulfilled'),
        results: settled.map((result) => result.status === 'fulfilled' ? result.value : `${result.reason}`),
    });
}
