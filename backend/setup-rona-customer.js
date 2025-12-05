#!/usr/bin/env node

/**
 * RONA CUSTOMER SETUP SCRIPT
 *
 * Bu script Rona için customer ve user kaydı oluşturur.
 * Kullanım: node setup-rona-customer.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupRonaCustomer() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   RONA TRACKER SETUP - Customer        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  try {
    // 1. Check if Rona customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { scriptId: 'rona_tracker' }
    });

    if (existingCustomer) {
      console.log('⚠️  Rona customer zaten mevcut!');
      console.log(`   Customer Name: ${existingCustomer.name}`);
      console.log(`   Script ID: ${existingCustomer.scriptId}`);
      console.log(`   API Key: ${existingCustomer.apiKey}`);
      console.log('');

      const overwrite = await question('Yeniden oluşturmak ister misiniz? (y/N): ');

      if (overwrite.toLowerCase() !== 'y') {
        console.log('İşlem iptal edildi.');
        rl.close();
        process.exit(0);
      }

      // Delete existing customer
      await prisma.customer.delete({
        where: { id: existingCustomer.id }
      });

      console.log('✅ Eski kayıt silindi.');
    }

    // 2. Get user input
    console.log('');
    const customerName = await question('Customer Name (default: Rona Casino): ') || 'Rona Casino';
    const userName = await question('Admin User Name (default: Rona Admin): ') || 'Rona Admin';
    const email = await question('Admin Email (default: admin@rona.com): ') || 'admin@rona.com';
    const password = await question('Admin Password (default: rona123): ') || 'rona123';
    const domains = await question('Allowed Domains (comma separated, default: ronabet.com): ') || 'ronabet.com';

    console.log('');
    console.log('🔄 Creating customer...');

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Generate API Key
    const apiKey = `trk_rona_${crypto.randomBytes(16).toString('hex')}`;

    // 5. Parse domains
    const allowedDomains = domains.split(',').map(d => d.trim()).filter(d => d.length > 0);

    // 6. Create customer with user
    const customer = await prisma.customer.create({
      data: {
        name: customerName,
        scriptId: 'rona_tracker',
        apiKey: apiKey,
        allowedDomains: allowedDomains,
        domConfig: {}, // Will be updated by update-rona-config.js
        users: {
          create: {
            name: userName,
            email: email,
            password: hashedPassword,
            role: 'OWNER'
          }
        }
      },
      include: {
        users: true
      }
    });

    console.log('');
    console.log('✅ Rona customer başarıyla oluşturuldu!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📋 CUSTOMER BİLGİLERİ:');
    console.log('═══════════════════════════════════════');
    console.log(`Customer ID:      ${customer.id}`);
    console.log(`Customer Name:    ${customer.name}`);
    console.log(`Script ID:        ${customer.scriptId}`);
    console.log(`API Key:          ${customer.apiKey}`);
    console.log(`Allowed Domains:  ${allowedDomains.join(', ')}`);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('👤 USER BİLGİLERİ:');
    console.log('═══════════════════════════════════════');
    console.log(`Name:             ${customer.users[0].name}`);
    console.log(`Email:            ${customer.users[0].email}`);
    console.log(`Password:         ${password}`);
    console.log(`Role:             ${customer.users[0].role}`);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔗 INTEGRATION:');
    console.log('═══════════════════════════════════════');
    console.log('Script URL:');
    console.log(`  http://localhost:3000/c/rona_tracker.js`);
    console.log('');
    console.log('Integration Code:');
    console.log(`  <script src="http://localhost:3000/c/rona_tracker.js" async></script>`);
    console.log('');
    console.log('Production URL (backend domain ile değiştir):');
    console.log(`  https://your-backend.com/c/rona_tracker.js`);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📝 SONRAKI ADIMLAR:');
    console.log('═══════════════════════════════════════');
    console.log('1. DOM Config yükle:');
    console.log('   node update-rona-config.js rona_tracker');
    console.log('');
    console.log('2. Backend\'i güncelle (tracker-rona.js kullanımı için)');
    console.log('');
    console.log('3. Test et:');
    console.log('   open test-rona-tracking.html');
    console.log('');
    console.log('4. Rona sitesine script tag\'ini ekle');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Hata oluştu:', error.message);
    console.error(error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run
setupRonaCustomer();
