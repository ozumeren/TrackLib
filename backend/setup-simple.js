// Basit Tracker Sistem Kurulumu
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function setupSimpleSystem() {
    console.log('🚀 Basit Tracker Sistemi Kuruluyor...\n');

    try {
        // 1. EBETLAB CUSTOMER
        const ebetlab = await prisma.customer.upsert({
            where: { scriptId: 'ebetlab' },
            update: {
                name: 'Ebetlab (RONA)',
                trackerType: 'ebetlab',
                allowedDomains: process.env.EBETLAB_ALLOWED_DOMAINS
                    ? process.env.EBETLAB_ALLOWED_DOMAINS.split(',')
                    : ['*']
            },
            create: {
                name: 'Ebetlab (RONA)',
                scriptId: 'ebetlab',
                trackerType: 'ebetlab',
                allowedDomains: process.env.EBETLAB_ALLOWED_DOMAINS
                    ? process.env.EBETLAB_ALLOWED_DOMAINS.split(',')
                    : ['*']
            }
        });

        console.log('✅ Ebetlab Customer Oluşturuldu:');
        console.log(`   - Script ID: ${ebetlab.scriptId}`);
        console.log(`   - Tracker Type: ${ebetlab.trackerType}`);
        console.log(`   - Allowed Domains: ${ebetlab.allowedDomains.join(', ')}\n`);

        // 2. TRUVA CUSTOMER
        const truva = await prisma.customer.upsert({
            where: { scriptId: 'truva' },
            update: {
                name: 'Truva (Pronet)',
                trackerType: 'pronet',
                allowedDomains: process.env.TRUVA_ALLOWED_DOMAINS
                    ? process.env.TRUVA_ALLOWED_DOMAINS.split(',')
                    : ['*']
            },
            create: {
                name: 'Truva (Pronet)',
                scriptId: 'truva',
                trackerType: 'pronet',
                allowedDomains: process.env.TRUVA_ALLOWED_DOMAINS
                    ? process.env.TRUVA_ALLOWED_DOMAINS.split(',')
                    : ['*']
            }
        });

        console.log('✅ Truva Customer Oluşturuldu:');
        console.log(`   - Script ID: ${truva.scriptId}`);
        console.log(`   - Tracker Type: ${truva.trackerType}`);
        console.log(`   - Allowed Domains: ${truva.allowedDomains.join(', ')}\n`);

        // 3. TEK KULLANICI OLUŞTUR (Dashboard login için)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@strastix.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Ebetlab customer'ına admin kullanıcı ekle
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (!existingUser) {
            await prisma.user.create({
                data: {
                    name: 'Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'OWNER',
                    customerId: ebetlab.id
                }
            });
            console.log('✅ Admin Kullanıcı Oluşturuldu:');
            console.log(`   - Email: ${adminEmail}`);
            console.log(`   - Password: ${adminPassword}\n`);
        } else {
            console.log('ℹ️  Admin kullanıcı zaten mevcut.\n');
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Basit Tracker Sistemi Hazır!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📋 SCRIPT URL\'LERİ:');
        console.log(`   Ebetlab: ${process.env.BACKEND_URL || 'http://localhost:3000'}/scripts/ebetlab.js`);
        console.log(`   Truva: ${process.env.BACKEND_URL || 'http://localhost:3000'}/scripts/truva.js\n`);

        console.log('📋 DASHBOARD ERIŞIMI:');
        console.log(`   URL: http://localhost:5173/login`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}\n`);

        console.log('⚠️  PRODUCTION NOTLARI:');
        console.log('   1. .env dosyasında ADMIN_PASSWORD\'ü değiştirin');
        console.log('   2. EBETLAB_ALLOWED_DOMAINS ve TRUVA_ALLOWED_DOMAINS ayarlayın');
        console.log('   3. Güvenlik için JWT_SECRET\'ı güncellein\n');

    } catch (error) {
        console.error('❌ Kurulum hatası:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Kurulumu çalıştır
setupSimpleSystem()
    .then(() => {
        console.log('✨ Tamamlandı!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
