const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { protectWithJWT, isOwner } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// List all customers (Admin only)
router.get('/', protectWithJWT, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            select: {
                id: true,
                name: true,
                scriptId: true,
                createdAt: true,
                _count: {
                    select: {
                        users: true,
                        events: true
                    }
                }
            }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Get current customer details
router.get('/current', protectWithJWT, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.customerId },
            select: {
                id: true,
                name: true,
                apiKey: true,
                scriptId: true,
                telegramBotToken: true,
                metaPixelId: true,
                metaAccessToken: true,
                googleAdsId: true,
                googleApiSecret: true,
            }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// Mevcut müşteri bilgilerini getirme (deprecated - use /current)
router.get('/me', protectWithJWT, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.customerId },
            select: { 
                id: true,
                name: true, 
                apiKey: true,
                scriptId: true,
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
        console.error('Müşteri bilgileri alınamadı:', error);
        res.status(500).json({ error: 'Müşteri bilgileri alınamadı.' });
    }
});

// İzin verilen domainleri getirme
router.get('/domains', protectWithJWT, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.customerId },
            select: { allowedDomains: true }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }
        res.json({ domains: customer.allowedDomains || [] });
    } catch (error) {
        console.error('Domain listesi alınamadı:', error);
        res.status(500).json({ error: 'Domain listesi alınamadı.' });
    }
});

// İzin verilen domainleri güncelleme
router.post('/domains', protectWithJWT, isOwner, async (req, res) => {
    const { domains } = req.body;
    
    if (!Array.isArray(domains)) {
        return res.status(400).json({ error: 'Domains bir array olmalıdır.' });
    }

    try {
        await prisma.customer.update({
            where: { id: req.user.customerId },
            data: { allowedDomains: domains },
        });
        res.json({ message: 'Domainler başarıyla güncellendi.' });
    } catch (error) {
        console.error('Domainler güncellenemedi:', error);
        res.status(500).json({ error: 'Domainler güncellenemedi.' });
    }
});

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

