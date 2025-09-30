const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Bir müşteriye ait tüm segmentleri ve oyuncu sayılarını listele
router.get('/', protect, async (req, res) => {
    const customerId = req.customer.id;
    try {
        const segments = await prisma.segment.findMany({
            where: { customerId },
            include: {
                _count: {
                    select: { players: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        
        const formattedSegments = segments.map(segment => ({
            id: segment.id,
            name: segment.name,
            description: segment.description,
            playerCount: segment._count.players,
        }));

        res.json(formattedSegments);
    } catch (error) {
        console.error('Segment verileri çekilirken hata oluştu:', error);
        res.status(500).json({ error: 'Segmentler çekilemedi.' });
    }
});

// Gelecekteki segment oluşturma, güncelleme ve silme işlemleri buraya eklenecek...

module.exports = router;
