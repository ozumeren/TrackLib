const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'bu-cok-gizli-bir-anahtar-ve-asla-degismemeli-12345'; 

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


async function protectWithApiKey(req, res, next) {
    try {
        const apiKey = req.body.api_key || req.query.api_key || req.headers['x-api-key'];

        if (!apiKey) {
            // HATA 1: API Key hiç yoksa, yanıt gönder ve bitir.
            return res.status(401).json({ error: 'API anahtarı gerekli.' });
        }

        const customer = await prisma.customer.findUnique({ where: { apiKey } });

        if (!customer) {
            // HATA 2: API Key geçersizse, yanıt gönder ve bitir.
            return res.status(403).json({ error: 'Geçersiz API anahtarı.' });
        }

        // BAŞARILI: Müşteri bulundu. Bilgiyi 'req' objesine ekle ve bir sonraki adıma geç.
        req.customer = customer;
        next(); // <<< EN ÖNEMLİ KISIM

    } catch (error) {
        console.error('API Key Middleware Hatası:', error);
        // HATA 3: Beklenmedik bir hata olursa, yanıt gönder ve bitir.
        return res.status(500).json({ error: 'Sunucu hatası.' });
    }
}

module.exports = { protectWithJWT, isOwner, isAdmin, protectWithApiKey }; // isAdmin'i export et

