// Run with: npx tsx src/scripts/seed-web-content.ts
import { prisma } from '../lib/prisma';

const defaults = [
  { section: 'stats', key: 'anos',       value: '+27', type: 'text' },
  { section: 'stats', key: 'comunidades', value: '+50', type: 'text' },
  { section: 'stats', key: 'arboles',    value: '+10K', type: 'text' },
  { section: 'stats', key: 'donaciones', value: '100%', type: 'text' },
  { section: 'stats', key: 'label_anos',       value: 'años de trabajo',         type: 'text' },
  { section: 'stats', key: 'label_comunidades', value: 'comunidades atendidas',  type: 'text' },
  { section: 'stats', key: 'label_arboles',    value: 'árboles plantados',        type: 'text' },
  { section: 'stats', key: 'label_donaciones', value: 'sin fines de lucro',      type: 'text' },
  { section: 'hero',  key: 'titulo',     value: 'Recuperando ecosistemas para la vida', type: 'text' },
  { section: 'hero',  key: 'subtitulo',  value: 'Desde 1997 · El Salvador',            type: 'text' },
  { section: 'hero',  key: 'descripcion', value: 'Trabajamos con comunidades rurales y urbanas de El Salvador para restaurar bosques, proteger manglares y construir un futuro sostenible.', type: 'text' },
];

async function main() {
  for (const item of defaults) {
    await prisma.webContent.upsert({
      where: { section_key: { section: item.section, key: item.key } },
      update: {},
      create: item,
    });
  }
  console.log('WebContent defaults seeded');
  await prisma.$disconnect();
}

main().catch(console.error);
