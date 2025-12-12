// Setup Static Customers for Ebetlab and Truva
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function setupStaticCustomers() {
    console.log('🚀 Setting up static customers for Ebetlab and Truva...\n');

    try {
        // 1. EBETLAB CUSTOMER
        const ebetlabApiKey = process.env.EBETLAB_API_KEY || 'trk_ebetlab_static';
        const ebetlabPassword = await bcrypt.hash('ebetlab123', 10);

        const ebetlab = await prisma.customer.upsert({
            where: { scriptId: 'ebetlab' },
            update: {
                apiKey: ebetlabApiKey,
                trackerType: 'ebetlab',
                allowedDomains: ['*'] // Tüm domainler (production'da değiştirin)
            },
            create: {
                name: 'Ebetlab (RONA)',
                scriptId: 'ebetlab',
                apiKey: ebetlabApiKey,
                trackerType: 'ebetlab',
                allowedDomains: ['*'],
                users: {
                    create: {
                        name: 'Ebetlab Admin',
                        email: 'admin@ebetlab.com',
                        password: ebetlabPassword,
                        role: 'OWNER'
                    }
                }
            },
            include: { users: true }
        });

        console.log('✅ Ebetlab Customer Created/Updated:');
        console.log(`   - Customer ID: ${ebetlab.id}`);
        console.log(`   - Script ID: ${ebetlab.scriptId}`);
        console.log(`   - API Key: ${ebetlab.apiKey}`);
        console.log(`   - Admin Email: admin@ebetlab.com`);
        console.log(`   - Admin Password: ebetlab123`);
        console.log(`   - Tracker Type: ${ebetlab.trackerType}\n`);

        // 2. TRUVA CUSTOMER
        const truvaApiKey = process.env.TRUVA_API_KEY || 'trk_truva_static';
        const truvaPassword = await bcrypt.hash('truva123', 10);

        const truva = await prisma.customer.upsert({
            where: { scriptId: 'truva' },
            update: {
                apiKey: truvaApiKey,
                trackerType: 'pronet',
                allowedDomains: ['*'] // Tüm domainler (production'da değiştirin)
            },
            create: {
                name: 'Truva (Pronet)',
                scriptId: 'truva',
                apiKey: truvaApiKey,
                trackerType: 'pronet',
                allowedDomains: ['*'],
                users: {
                    create: {
                        name: 'Truva Admin',
                        email: 'admin@truva.com',
                        password: truvaPassword,
                        role: 'OWNER'
                    }
                }
            },
            include: { users: true }
        });

        console.log('✅ Truva Customer Created/Updated:');
        console.log(`   - Customer ID: ${truva.id}`);
        console.log(`   - Script ID: ${truva.scriptId}`);
        console.log(`   - API Key: ${truva.apiKey}`);
        console.log(`   - Admin Email: admin@truva.com`);
        console.log(`   - Admin Password: truva123`);
        console.log(`   - Tracker Type: ${truva.trackerType}\n`);

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Setup Complete!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📋 DASHBOARD ACCESS:');
        console.log('\n🔷 Ebetlab Dashboard:');
        console.log('   Login URL: http://localhost:5173/login');
        console.log('   Email: admin@ebetlab.com');
        console.log('   Password: ebetlab123');
        console.log('   Script URL: http://localhost:3000/scripts/ebetlab.js');
        console.log('   Script URL (alias): http://localhost:3000/c/ebetlab.js\n');

        console.log('🔷 Truva Dashboard:');
        console.log('   Login URL: http://localhost:5173/login');
        console.log('   Email: admin@truva.com');
        console.log('   Password: truva123');
        console.log('   Script URL: http://localhost:3000/scripts/truva.js');
        console.log('   Script URL (alias): http://localhost:3000/c/truva.js\n');

        console.log('⚠️  PRODUCTION NOTES:');
        console.log('   1. Change passwords via Settings page');
        console.log('   2. Update allowedDomains in Settings');
        console.log('   3. Set strong API keys in .env file\n');

    } catch (error) {
        console.error('❌ Error setting up customers:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run setup
setupStaticCustomers()
    .then(() => {
        console.log('✨ Done!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
