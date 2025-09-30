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
            
            req.user = await prisma.user.findUnique({ 
                where: { id: decoded.userId } 
            });

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

const protectWithApiKey = async (req, res, next) => {
    const apiKey = req.body.api_key;
    if (!apiKey) {
        return res.status(401).json({ message: 'Not authorized, no API key' });
    }
    try {
        const customer = await prisma.customer.findUnique({ where: { apiKey } });
        if (!customer) {
            return res.status(401).json({ message: 'Not authorized, invalid API key' });
        }
        req.customer = customer;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protectWithJWT, isOwner, protectWithApiKey };
