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
        const formattedSegments = segments.map(s => ({
            id: s.id, name: s.name, description: s.description,
            playerCount: s._count.players, criteria: s.criteria
        }));
        res.json(formattedSegments);
    } catch (error) {
        res.status(500).json({ error: 'Segmentler çekilemedi.' });
    }
});

router.post('/', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { name, description, criteria } = req.body;
    if (!name || !criteria) {
        return res.status(400).json({ error: 'Segment adı ve kriterleri zorunludur.' });
    }
    try {
        const newSegment = await prisma.segment.create({
            data: { name, description, criteria, customerId }
        });
        res.status(201).json(newSegment);
    } catch (error) {
        res.status(500).json({ error: 'Segment oluşturulamadı.' });
    }
});

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
        res.json({ message: 'Segment güncellendi.' });
    } catch (error) {
        res.status(500).json({ error: 'Segment güncellenemedi.' });
    }
});
    
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
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Segment silinemedi.' });
    }
});

module.exports = router;

