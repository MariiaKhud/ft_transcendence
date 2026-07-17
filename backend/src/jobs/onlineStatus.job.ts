import { prisma } from '../lib/prisma.js';

const OFFLINE_AFTER_MS = 2 * 60 * 1000; // 2 minutes

export function startOnlineStatusJob() {
  setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - OFFLINE_AFTER_MS);

    await prisma.user.updateMany({
      where: {
        isOnline: true,
        lastSeenAt: { lt: cutoff },  // last seen more than 2 min ago
      },
      data: {
        isOnline: false,
      },
    });
  } catch (err) {
    console.error('Online status job failed:', err);
  }
}, 30_000); // runs every 30 seconds
}
