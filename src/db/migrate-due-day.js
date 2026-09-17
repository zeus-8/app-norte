import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_day integer DEFAULT 5;`);
  console.log('✅ Column due_day added to expenses successfully');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
