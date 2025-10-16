// backend/adminRoutes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT, isAdmin } = require('./authMiddleware');

const prisma = new PrismaClient();

// Tüm müşterileri listele
router.get('/customers', protectWithJWT, isAdmin, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    
    const customersWithCount = customers.map(c => ({
      ...c,
      userCount: c._count.users
    }));
    
    res.json(customersWithCount);
  } catch (error) {
    console.error('Admin customers list error:', error);
    res.status(500).json({ error: 'Müşteri listesi alınamadı' });
  }
});

// Tek müşteri detayı
router.get('/customers/:id', protectWithJWT, isAdmin, async (req, res) => {
  try {
    const id = req.params.id; // String - parseInt kullanma
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).json({ error: 'Müşteri detayları alınamadı' });
  }
});

// DOM Config güncelle
router.put('/customers/:id/domconfig', protectWithJWT, isAdmin, async (req, res) => {
  try {
    const id = req.params.id; // String
    const { domConfig } = req.body;
    
    await prisma.customer.update({
      where: { id },
      data: { domConfig }
    });
    
    res.json({ message: 'Yapılandırma güncellendi' });
  } catch (error) {
    console.error('DomConfig update error:', error);
    res.status(500).json({ error: 'Yapılandırma güncellenemedi' });
  }
});

module.exports = router;
