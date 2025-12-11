# Coolify Setup Guide - Managed Databases

Bu rehber Coolify'ın managed database özelliklerini kullanarak deployment yapar.

## Adım 1: PostgreSQL Managed Database Oluştur

### Coolify Dashboard'da:

1. **Resources → Databases → New Database**
2. **PostgreSQL 15** seçin
3. Ayarlar:
   ```
   Name: strastix-postgres
   Database Name: strastix_db
   Database User: strastix_user
   Database Password: MyStrongPassword2024
   Version: 15
   ```
4. **Create** → Deploy
5. **Connection Details** kopyalayın:
   ```
   Internal URL: postgresql://strastix_user:MyStrongPassword2024@strastix-postgres:5432/strastix_db
   ```

## Adım 2: Redis Managed Database Oluştur

### Coolify Dashboard'da:

1. **Resources → Databases → New Database**
2. **Redis 7** seçin
3. Ayarlar:
   ```
   Name: strastix-redis
   Version: 7
   Password: (boş bırak veya şifre ekle)
   ```
4. **Create** → Deploy
5. **Connection Details** kopyalayın:
   ```
   Internal URL: redis://strastix-redis:6379
   Host: strastix-redis
   Port: 6379
   ```

## Adım 3: Backend Application Deploy

### Coolify Dashboard'da:

1. **New Service → Docker Compose**
2. Ayarlar:
   ```
   Repository: https://github.com/ozumeren/TrackLib.git
   Branch: main
   Base Directory: (boş)
   Compose File: docker-compose.simple.yml
   ```

3. **Environment Variables:**
   ```bash
   # Database (Adım 1'den kopyala)
   DATABASE_URL=postgresql://strastix_user:MyStrongPassword2024@strastix-postgres:5432/strastix_db

   # Redis (Adım 2'den kopyala)
   REDIS_URL=redis://strastix-redis:6379
   REDIS_HOST=strastix-redis
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # JWT Secret
   JWT_SECRET=your_very_long_random_secret_min_32_chars_2024

   # Domains
   BACKEND_DOMAIN=api.strastix.com
   FRONTEND_DOMAIN=strastix.com
   TEST_CASINO_DOMAIN=test.strastix.com
   ```

4. **Deploy**

## Adım 4: Domain Ayarları

### Backend
```
Domain: api.strastix.com
Port: 3000
SSL: Enabled
```

### Frontend
```
Domain: strastix.com
Port: 3001
SSL: Enabled
```

### Test Casino
```
Domain: test.strastix.com
Port: 80
SSL: Enabled
```

## Adım 5: DNS Ayarları

Domain sağlayıcınızda:

```
Type: A
Name: @
Value: YOUR_COOLIFY_SERVER_IP

Type: A
Name: api
Value: YOUR_COOLIFY_SERVER_IP

Type: A
Name: test
Value: YOUR_COOLIFY_SERVER_IP
```

## Adım 6: Doğrulama

```bash
# Backend health
curl https://api.strastix.com/health

# Frontend
curl https://strastix.com

# Test Casino
curl https://test.strastix.com/health
```

## Avantajlar

✅ PostgreSQL ve Redis Coolify tarafından yönetiliyor
✅ Otomatik backup
✅ Kolay scaling
✅ Ayrı ayrı monitoring
✅ Environment variable sorunları yok
✅ Her servis bağımsız restart edilebilir

## Sorun Giderme

### Backend PostgreSQL'e Bağlanamıyor

1. Database servisinin çalıştığını kontrol edin
2. DATABASE_URL'in doğru olduğunu kontrol edin
3. Network connectivity test:
   ```bash
   docker exec strastix-backend ping strastix-postgres
   ```

### Backend Redis'e Bağlanamıyor

1. Redis servisinin çalıştığını kontrol edin
2. REDIS_HOST ve REDIS_PORT'u kontrol edin
3. Redis şifresi boşsa REDIS_PASSWORD="" olmalı

### Migration Hataları

Backend container'ına girin:
```bash
docker exec -it strastix-backend sh
npx prisma migrate deploy
```

## Backup

### PostgreSQL Backup

Coolify'da:
- Database → Backups → Configure
- Otomatik backup schedule ayarlayın

Manuel backup:
```bash
# Coolify'dan connection string alın
docker exec strastix-postgres pg_dump -U strastix_user strastix_db > backup.sql
```

### Redis Backup

Coolify otomatik persistence yapıyor (AOF enabled).

---

**Bu yöntem daha stabil ve yönetimi kolay!** 🚀
