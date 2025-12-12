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


// Basitleştirilmiş: Script ID ile customer belirleme
async function protectByScriptId(req, res, next) {
    try {
        const scriptId = req.body.script_id || req.query.script_id || req.headers['x-script-id'];

        if (!scriptId) {
            return res.status(400).json({ error: 'Script ID gerekli.' });
        }

        // Script ID sadece 'ebetlab' veya 'truva' olabilir
        if (scriptId !== 'ebetlab' && scriptId !== 'truva') {
            return res.status(400).json({ error: 'Geçersiz Script ID. Sadece "ebetlab" veya "truva" kullanılabilir.' });
        }

        const customer = await prisma.customer.findUnique({ where: { scriptId } });

        if (!customer) {
            return res.status(404).json({ error: `${scriptId} için customer kaydı bulunamadı.` });
        }

        // Customer'ı req'e ekle
        req.customer = customer;
        next();

    } catch (error) {
        console.error('Script ID Middleware Hatası:', error);
        return res.status(500).json({ error: 'Sunucu hatası.' });
    }
}

module.exports = { protectWithJWT, isOwner, isAdmin, protectByScriptId };

