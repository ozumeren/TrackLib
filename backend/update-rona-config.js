#!/usr/bin/env node

/**
 * RONA DOM CONFIG UPDATE SCRIPT
 *
 * Bu script, Rona müşterisinin domConfig ayarlarını database'e yükler.
 *
 * Kullanım:
 *   node update-rona-config.js <scriptId>
 *
 * Örnek:
 *   node update-rona-config.js rona_tracker
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function updateRonaConfig() {
  const scriptId = process.argv[2];

  if (!scriptId) {
    console.error('❌ Hata: Script ID belirtilmedi!');
    console.log('Kullanım: node update-rona-config.js <scriptId>');
    console.log('Örnek:    node update-rona-config.js rona_tracker');
    process.exit(1);
  }

  try {
    // 1. Müşteriyi bul
    console.log(`🔍 Müşteri aranıyor: ${scriptId}`);

    const customer = await prisma.customer.findUnique({
      where: { scriptId: scriptId }
    });

    if (!customer) {
      console.error(`❌ Müşteri bulunamadı: ${scriptId}`);
      console.log('');
      console.log('Mevcut müşteriler:');
      const customers = await prisma.customer.findMany({
        select: { id: true, name: true, scriptId: true }
      });
      customers.forEach(c => {
        console.log(`  - ${c.name} (${c.scriptId})`);
      });
      process.exit(1);
    }

    console.log(`✅ Müşteri bulundu: ${customer.name} (ID: ${customer.id})`);

    // 2. DOM config dosyasını oku
    const configPath = path.join(__dirname, 'rona-dom-config.json');

    if (!fs.existsSync(configPath)) {
      console.error(`❌ Config dosyası bulunamadı: ${configPath}`);
      process.exit(1);
    }

    const domConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`✅ Config dosyası okundu: ${domConfig.rules.length} rule bulundu`);

    // 3. Database'i güncelle
    console.log('📝 Database güncelleniyor...');

    await prisma.customer.update({
      where: { id: customer.id },
      data: { domConfig: domConfig }
    });

    console.log('✅ Database başarıyla güncellendi!');
    console.log('');
    console.log('📋 Yüklenen Rule\'lar:');
    domConfig.rules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.name}`);
      console.log(`     Event: ${rule.eventName}`);
      console.log(`     Selector: ${rule.selector}`);
      console.log(`     Trigger: ${rule.trigger}`);
      if (rule.conditions) {
        console.log(`     Conditions: ${JSON.stringify(rule.conditions)}`);
      }
      console.log('');
    });

    console.log('🎯 Script URL:');
    console.log(`   http://localhost:3000/c/${scriptId}.js`);
    console.log('');
    console.log('💡 Integration Code:');
    console.log(`   <script src="http://localhost:3000/c/${scriptId}.js" async></script>`);
    console.log('');

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
updateRonaConfig();
