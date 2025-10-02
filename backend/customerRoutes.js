const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { protectWithJWT, isOwner } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Müşteri ayarlarını getirme
router.get('/settings', protectWithJWT, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.customerId },
            // DEĞİŞİKLİK: Yeni reklam platformu alanlarını da seç
            select: { 
                name: true, 
                apiKey: true, 
                telegramBotToken: true,
                metaPixelId: true,
                metaAccessToken: true,
                googleAdsId: true,
                googleApiSecret: true,
            }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Ayarlar alınamadı.' });
    }
});

// Müşteri ayarlarını güncelleme
router.put('/settings', protectWithJWT, isOwner, async (req, res) => {
    // DEĞİŞİKLİK: body'den tüm yeni alanları al
    const { 
        telegramBotToken,
        metaPixelId,
        metaAccessToken,
        googleAdsId,
        googleApiSecret,
    } = req.body;

    try {
        await prisma.customer.update({
            where: { id: req.user.customerId },
            // DEĞİŞİKLİK: Gelen tüm verilerle güncelle
            data: { 
                telegramBotToken,
                metaPixelId,
                metaAccessToken,
                googleAdsId,
                googleApiSecret,
            },
        });
        res.json({ message: 'Ayarlar başarıyla güncellendi.' });
    } catch (error) {
        res.status(500).json({ error: 'Ayarlar güncellenemedi.' });
    }
});

// API Anahtarını Yeniden Oluşturma
router.put('/settings/renew-api-key', protectWithJWT, isOwner, async (req, res) => {
    try {
        const newApiKey = `trk_${crypto.randomBytes(16).toString('hex')}`;
        await prisma.customer.update({
            where: { id: req.user.customerId },
            data: { apiKey: newApiKey },
        });
        res.json({ newApiKey: newApiKey });
    } catch (error) {
        res.status(500).json({ error: 'API anahtarı yenilenemedi.' });
    }
});

module.exports = router;

