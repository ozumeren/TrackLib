const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('📊 Current settings:');
    const before = await prisma.customer.findUnique({
      where: { scriptId: 'strastix_eren' },
      select: { name: true, scriptId: true, trackerType: true }
    });
    console.log(JSON.stringify(before, null, 2));

    console.log('\n🔄 Updating to ebetlab...');
    await prisma.customer.update({
      where: { scriptId: 'strastix_eren' },
      data: { trackerType: 'ebetlab' }
    });

    console.log('\n✅ After update:');
    const after = await prisma.customer.findUnique({
      where: { scriptId: 'strastix_eren' },
      select: { name: true, scriptId: true, trackerType: true }
    });
    console.log(JSON.stringify(after, null, 2));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
