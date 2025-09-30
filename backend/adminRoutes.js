const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT, isAdmin } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Tüm Müşterileri Listele (Sadece Admin)
router.get('/customers', protectWithJWT, isAdmin, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, apiKey: true }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Müşteriler listelenemedi.' });
    }
});

// Bir Müşterinin Detaylarını ve domConfig'ini Getir (Sadece Admin)
router.get('/customers/:id', protectWithJWT, isAdmin, async (req, res) => {
    const customerId = parseInt(req.params.id, 10);
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, domConfig: true }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Müşteri detayları alınamadı.' });
    }
});

// Bir Müşterinin domConfig'ini Güncelle (Sadece Admin)
router.put('/customers/:id/domconfig', protectWithJWT, isAdmin, async (req, res) => {
    const customerId = parseInt(req.params.id, 10);
    const { domConfig } = req.body;

    if (typeof domConfig !== 'object') {
        return res.status(400).json({ error: 'domConfig geçerli bir JSON objesi olmalıdır.' });
    }

    try {
        await prisma.customer.update({
            where: { id: customerId },
            data: { domConfig },
        });
        res.json({ message: 'Müşteri yapılandırması başarıyla güncellendi.' });
    } catch (error) {
        res.status(500).json({ error: 'Müşteri yapılandırması güncellenemedi.' });
    }
});

module.exports = router;

