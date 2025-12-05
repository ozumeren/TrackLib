// delete-rona-customer.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.customer.deleteMany({
      where: {
        scriptId: 'strastix_rona_tracker'
      }
    });

    console.log(`✅ Deleted ${result.count} customer(s)`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
