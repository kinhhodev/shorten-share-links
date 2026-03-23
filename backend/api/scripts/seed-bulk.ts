/**
 * Seed: 1000 users × 1000 links = 1.000.000 links (long_url = https://google.com).
 *
 * Chạy (từ backend/api):
 *   SEED_BULK_CONFIRM=1 npx tsx scripts/seed-bulk.ts
 *
 * Yêu cầu: DATABASE_URL trong .env (root repo), migration đã chạy.
 * Chạy trên DB trống hoặc email `bulk-seed-*@seed.local` chưa tồn tại (trùng email sẽ lỗi).
 */
import '../src/env';
import { db, pool } from '../src/db/client';
import { links, users } from '../src/db/schema';
import { hashPassword } from '../src/auth/password';

const USER_COUNT = 1000;
const LINKS_PER_USER = 1000;
const LONG_URL = 'https://google.com';
const LINK_BATCH = 4000;

async function main() {
  if (process.env.SEED_BULK_CONFIRM !== '1') {
    console.error(
      'Từ chối: thao tác sẽ tạo 1000 user và 1.000.000 link. Đặt SEED_BULK_CONFIRM=1 để chạy.',
    );
    process.exit(1);
  }

  console.log('Bắt đầu seed (hash mật khẩu 1 lần, chèn theo lô)...');
  const t0 = Date.now();
  const passwordHash = await hashPassword('BulkSeed_Password_ChangeMe_1!');

  const userRows = Array.from({ length: USER_COUNT }, (_, i) => ({
    fullName: `Bulk Seed User ${i}`,
    phone: '0000000000',
    email: `bulk-seed-${i}@seed.local`,
    passwordHash,
  }));

  console.log(`Đang chèn ${USER_COUNT} user...`);
  const inserted = await db.insert(users).values(userRows).returning({ id: users.id });
  if (inserted.length !== USER_COUNT) {
    throw new Error(`Expected ${USER_COUNT} users, got ${inserted.length}`);
  }
  const userIds = inserted.map((u) => u.id);
  console.log(`Đã chèn ${USER_COUNT} user (${Date.now() - t0}ms).`);

  const totalLinks = USER_COUNT * LINKS_PER_USER;
  let insertedLinks = 0;

  for (let offset = 0; offset < totalLinks; offset += LINK_BATCH) {
    const batch: {
      project: null;
      code: string;
      longUrl: string;
      ownerUserId: string;
    }[] = [];

    const end = Math.min(offset + LINK_BATCH, totalLinks);
    for (let g = offset; g < end; g++) {
      const userIdx = Math.floor(g / LINKS_PER_USER);
      const linkIdx = g % LINKS_PER_USER;
      const code = `s${String(userIdx).padStart(4, '0')}x${String(linkIdx).padStart(4, '0')}`;
      batch.push({
        project: null,
        code,
        longUrl: LONG_URL,
        ownerUserId: userIds[userIdx]!,
      });
    }

    await db.insert(links).values(batch);
    insertedLinks += batch.length;
    if (insertedLinks % 100_000 === 0 || insertedLinks === totalLinks) {
      console.log(`  Link đã chèn: ${insertedLinks} / ${totalLinks} (${Date.now() - t0}ms)`);
    }
  }

  console.log(`Hoàn tất ${insertedLinks} link. Tổng thời gian: ${Date.now() - t0}ms`);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  pool.end().finally(() => process.exit(1));
});
