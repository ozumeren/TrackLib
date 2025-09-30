const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = 'bu-cok-gizli-bir-anahtar-ve-asla-degismemeli-12345'; 

const protectWithJWT = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!req.user) {
                 return res.status(401).json({ message: 'Yetki reddedildi, kullanıcı bulunamadı' });
            }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Yetki reddedildi, jeton geçersiz' });
        }
    } else {
        res.status(401).json({ message: 'Yetki reddedildi, jeton bulunamadı' });
    }
};

const isOwner = (req, res, next) => {
    if (req.user && req.user.role === 'OWNER') {
        next();
    } else {
        res.status(403).json({ message: 'Bu işlemi yapmak için yetkiniz yok.' });
    }
};

// --- YENİ: Admin Rolü Kontrolü ---
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Bu alana erişim yetkiniz yok.' });
    }
};


const protectWithApiKey = async (req, res, next) => {
    // ... (Bu fonksiyon aynı kalıyor) ...
};

module.exports = { protectWithJWT, isOwner, isAdmin, protectWithApiKey }; // isAdmin'i export et

