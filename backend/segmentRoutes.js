const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// GET / - Tüm segmentleri ve oyuncu sayılarını listele
// ============================================
router.get('/', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    try {
        const segments = await prisma.segment.findMany({
            where: { customerId },
            include: { 
                _count: { 
                    select: { players: true } 
                } 
            },
            orderBy: { name: 'asc' },
        });
        
        const formattedSegments = segments.map(s => ({
            id: s.id, 
            name: s.name, 
            description: s.description,
            playerCount: s._count?.players || 0,
            criteria: s.criteria
        }));

        res.json(formattedSegments);
    } catch (error) {
        console.error("Segmentler çekilirken hata:", error);
        res.status(500).json({ 
            error: 'Segmentler çekilemedi.',
            message: error.message
        });
    }
});

// ============================================
// POST /:id/evaluate - Manuel segment değerlendirme
// ============================================
router.post('/:id/evaluate', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const segmentId = parseInt(req.params.id, 10);

    try {
        const segmentEvaluator = require('./services/segmentEvaluator');
        
        const segment = await prisma.segment.findFirst({
            where: { id: segmentId, customerId }
        });

        if (!segment) {
            return res.status(404).json({ error: 'Segment bulunamadı' });
        }

        // Tüm oyuncuları değerlendir
        const players = await prisma.player.findMany({
            where: { customerId },
            select: { id: true, playerId: true }
        });

        const matchingPlayerIds = [];

        for (const player of players) {
            const matches = await segmentEvaluator.evaluatePlayerForSegment(
                player.playerId,
                customerId,
                segment
            );

            if (matches) {
                matchingPlayerIds.push(player.id);
            }
        }

        // Segment'i güncelle
        await prisma.segment.update({
            where: { id: segmentId },
            data: {
                players: {
                    set: matchingPlayerIds.map(id => ({ id }))
                }
            }
        });

        console.log(`✅ Segment "${segment.name}" evaluated: ${matchingPlayerIds.length} players matched`);

        res.json({ 
            message: 'Segment başarıyla değerlendirildi',
            playerCount: matchingPlayerIds.length 
        });

    } catch (error) {
        console.error('Segment evaluation error:', error);
        res.status(500).json({ 
            error: 'Segment değerlendirilemedi',
            message: error.message
        });
    }
});

// ============================================
// POST / - Yeni segment oluştur
// ============================================
router.post('/', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { name, description, criteria } = req.body;

    if (!name || !criteria) {
        return res.status(400).json({ error: 'Segment adı ve kriterleri zorunludur.' });
    }

    try {
        const newSegment = await prisma.segment.create({
            data: {
                name,
                description,
                criteria,
                customerId,
            }
        });
        
        console.log(`✅ Yeni segment oluşturuldu: ${name}`);
        res.status(201).json(newSegment);
    } catch (error) {
        console.error('Segment oluşturma hatası:', error);
        res.status(500).json({ error: 'Segment oluşturulamadı.' });
    }
});

// ============================================
// PUT /:id - Segment güncelle
// ============================================
router.put('/:id', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const segmentId = parseInt(req.params.id, 10);
    const { name, description, criteria } = req.body;

    try {
        const updatedSegment = await prisma.segment.updateMany({
            where: { id: segmentId, customerId },
            data: { name, description, criteria },
        });
        
        if (updatedSegment.count === 0) {
            return res.status(404).json({ error: 'Segment bulunamadı veya yetkiniz yok.' });
        }
        
        console.log(`✅ Segment güncellendi: ID ${segmentId}`);
        res.json({ message: 'Segment güncellendi.' });
    } catch (error) {
        console.error('Segment güncelleme hatası:', error);
        res.status(500).json({ error: 'Segment güncellenemedi.' });
    }
});

// ============================================
// DELETE /:id - Segment sil
// ============================================
router.delete('/:id', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const segmentId = parseInt(req.params.id, 10);

    try {
        const deletedSegment = await prisma.segment.deleteMany({
            where: { id: segmentId, customerId },
        });
        
        if (deletedSegment.count === 0) {
            return res.status(404).json({ error: 'Segment bulunamadı veya yetkiniz yok.' });
        }
        
        console.log(`✅ Segment silindi: ID ${segmentId}`);
        res.status(204).send();
    } catch (error) {
        console.error('Segment silme hatası:', error);
        res.status(500).json({ error: 'Segment silinemedi.' });
    }
});

module.exports = router;