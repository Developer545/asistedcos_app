// Run with: npx tsx src/scripts/seed-images.ts
// Requires /tmp/cloudinary_urls.json with an array of uploaded photo URLs.
import fs from 'fs';
import { prisma } from '../lib/prisma';

async function main() {
  const rawPath = '/tmp/cloudinary_urls.json';

  if (!fs.existsSync(rawPath)) {
    console.error(`File not found: ${rawPath}`);
    console.error('Create it with an array of Cloudinary URLs, e.g.:');
    console.error('  ["https://res.cloudinary.com/.../hero.jpg", "https://res.cloudinary.com/.../about.jpg"]');
    process.exit(1);
  }

  const photos: string[] = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

  if (!photos[0] || !photos[1]) {
    console.error('Need at least 2 URLs in the array: [heroUrl, aboutUrl]');
    process.exit(1);
  }

  const defaults = [
    { section: 'hero',  key: 'imagen', value: photos[0], type: 'image' },
    { section: 'about', key: 'imagen', value: photos[1], type: 'image' },
  ];

  for (const item of defaults) {
    await prisma.webContent.upsert({
      where: { section_key: { section: item.section, key: item.key } },
      update: {},        // do NOT overwrite if already set
      create: item,
    });
    console.log(`Seeded ${item.section}__${item.key}`);
  }

  console.log('Image defaults seeded successfully.');
  await prisma.$disconnect();
}

main().catch(console.error);
