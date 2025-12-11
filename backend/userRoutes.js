const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { protectWithJWT } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// List all users (Admin/Owner only) - this route is protected in index.js
router.get('/', protectWithJWT, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { customerId: req.user.customerId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Giriş yapmış kullanıcının kendi bilgilerini getirme
router.get('/me', protectWithJWT, async (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
    });
});

// Giriş yapmış kullanıcının kendi bilgilerini güncelleme
router.put('/me', protectWithJWT, async (req, res) => {
    const { name, email, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
    }
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
        });
        res.json({ message: 'Profiliniz başarıyla güncellendi.' });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
        res.status(500).json({ error: 'Profil güncellenemedi.' });
    }
});

module.exports = router;

