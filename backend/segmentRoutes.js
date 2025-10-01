const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    try {
        const segments = await prisma.segment.findMany({
            where: { customerId },
            include: { _count: { select: { players: true } } },
            orderBy: { name: 'asc' },
        });
        
        // DEĞİŞİKLİK: s._count'ın var olup olmadığını kontrol et
        const formattedSegments = segments.map(s => ({
            id: s.id, 
            name: s.name, 
            description: s.description,
            playerCount: s._count?.players || 0, // Optional chaining eklendi
            criteria: s.criteria
        }));

        res.json(formattedSegments);
    } catch (error) {
        console.error("Segmentler çekilirken hata:", error);
        res.status(500).json({ error: 'Segmentler çekilemedi.' });
    }
});

// ... (Diğer POST, PUT, DELETE rotaları aynı kalıyor) ...

module.exports = router;

