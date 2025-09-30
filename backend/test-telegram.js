// Bu dosya, sadece Telegram bağlantımızı test etmek içindir.
const { PrismaClient } = require('@prisma/client');
const TelegramBot = require('node-telegram-bot-api');

const prisma = new PrismaClient();

async function sendTestMessage() {
  console.log('Test mesajı gönderme işlemi başlatılıyor...');

  // Veritabanından test müşterimizin bilgilerini al
  const customer = await prisma.customer.findUnique({
    where: { apiKey: 'MUSTERI_XXXX_API_ANAHTARI' },
  });

  if (!customer || !customer.telegramBotToken) {
    console.error('Müşteri bulunamadı veya bot token\'ı eksik!');
    return;
  }

  const token = customer.telegramBotToken;
  const chatId = '7800741138'; // <-- KENDİ CHAT ID'NİZİ BURAYA YAZIN

  // Bot'u token ile başlat
  const bot = new TelegramBot(token);

  try {
    await bot.sendMessage(chatId, 'Bu, veritabanından alınan token ile gönderilen bir test mesajıdır!');
    console.log('Mesaj başarıyla gönderildi!');
  } catch (error) {
    console.error('Mesaj gönderilirken hata oluştu:', error.message);
  } finally {
    // Prisma bağlantısını düzgünce kapat
    await prisma.$disconnect();
  }
}

sendTestMessage();
