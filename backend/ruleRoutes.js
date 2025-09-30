const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT, isOwner } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Bir müşteriye ait tüm kuralları listele
router.get('/', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    try {
        const rules = await prisma.rule.findMany({
            where: { customerId },
            include: { 
                variants: true,
                _count: { select: { variants: true } }
            },
            orderBy: { name: 'asc' },
        });
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: 'Kurallar çekilemedi.' });
    }
});

// Yeni bir kural ve varyantlarını oluştur
router.post('/', protectWithJWT, isOwner, async (req, res) => {
    const customerId = req.user.customerId;
    const { name, isActive, triggerType, config, conversionGoalEvent, variants } = req.body;

    if (!name || !triggerType || !variants || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'Kural adı, tetikleyici türü ve en az bir varyant zorunludur.' });
    }

    try {
        const newRule = await prisma.rule.create({
            data: {
                name,
                isActive,
                triggerType,
                config,
                conversionGoalEvent,
                customerId,
                variants: {
                    create: variants.map(v => ({
                        name: v.name,
                        actionType: v.actionType,
                        actionPayload: v.actionPayload,
                    })),
                },
            },
            include: {
                variants: true,
            }
        });
        res.status(201).json(newRule);
    } catch (error) {
        console.error("Kural oluşturma hatası:", error);
        res.status(500).json({ error: 'Kural oluşturulamadı.' });
    }
});

// Bir kuralı güncelle
router.put('/:id', protectWithJWT, isOwner, async (req, res) => {
    const customerId = req.user.customerId;
    const ruleId = parseInt(req.params.id, 10);
    const { name, isActive, triggerType, config, conversionGoalEvent, variants } = req.body;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.rule.update({
                where: { id: ruleId, customerId },
                data: { name, isActive, triggerType, config, conversionGoalEvent },
            });
            const existingVariantIds = (await tx.ruleVariant.findMany({
                where: { ruleId },
                select: { id: true }
            })).map(v => v.id);
            const incomingVariantIds = variants.map(v => v.id).filter(id => id);
            const variantsToDelete = existingVariantIds.filter(id => !incomingVariantIds.includes(id));
            if (variantsToDelete.length > 0) {
                await tx.ruleVariant.deleteMany({
                    where: { id: { in: variantsToDelete } }
                });
            }
            for (const variant of variants) {
                if (variant.id) {
                    await tx.ruleVariant.update({
                        where: { id: variant.id },
                        data: { name: variant.name, actionType: variant.actionType, actionPayload: variant.actionPayload }
                    });
                } else {
                    await tx.ruleVariant.create({
                        data: {
                            name: variant.name,
                            actionType: variant.actionType,
                            actionPayload: variant.actionPayload,
                            ruleId: ruleId
                        }
                    });
                }
            }
        });
        res.json({ message: 'Kural başarıyla güncellendi.' });
    } catch (error) {
        console.error("Kural güncelleme hatası:", error);
        res.status(500).json({ error: 'Kural güncellenemedi.' });
    }
});

// Bir kuralı sil
router.delete('/:id', protectWithJWT, isOwner, async (req, res) => {
    const customerId = req.user.customerId;
    const ruleId = parseInt(req.params.id, 10);

    try {
        const deletedRule = await prisma.rule.deleteMany({
            where: { id: ruleId, customerId },
        });
        if (deletedRule.count === 0) {
            return res.status(404).json({ error: 'Kural bulunamadı veya yetkiniz yok.' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Kural silinemedi.' });
    }
});

module.exports = router;

