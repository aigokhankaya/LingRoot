───────────────────────────────────────────────────────────────────────────────────────────────────────
 Create file                                                                                           
 docs/performance/REDIS_OPTIMIZATION_PLAN.md                                                           
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 # Redis Performans Iyilestirme Plani                                                                  
                                                                                                       
 > **Created:** 2026-02-15 | **Updated:** 2026-02-15 | **Version:** 1.0                                
                                                                                                       
 ## Ozet                                                                                               
                                                                                                       
 Redis'te aylik 500k limit cok kisa surede doluyor. Analiz sonucu tespit edilen sorunlar ve cozum      
 onerileri asagida detaylandirilmistir.                                                                
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 1. Mevcut Durum Analizi                                                                            
                                                                                                       
 ### 1.1 Redis Kullanan Bilesenler                                                                     
                                                                                                       
 | Bilesen | Dosya | Islem | Tahmini Cagri/Request |                                                   
 |---------|-------|-------|----------------------|                                                    
 | Auth Middleware | `middleware/auth.js` | Token blacklist + User cache | 2-4 GET/SETEX |             
 | Redis Cache | `middleware/redisCache.js` | Response caching | 1-2 GET/SETEX |                       
 | Cache Invalidation | `middleware/redisCache.js` | KEYS + DEL | 2+ (TEHLIKELI!) |                    
 | BullMQ | `utils/infra/bullQueue.js` | Job queue operations | 5+ per stats call |                    
                                                                                                       
 ### 1.2 Kritik Sorunlar                                                                               
                                                                                                       
 #### SORUN 1: Auth Middleware'de Asiri Redis Cagrisi                                                  
 **Dosya:** `backend/middleware/auth.js:58-121`                                                        
                                                                                                       
 ```                                                                                                   
 Her authenticated request icin:                                                                       
 1. isTokenBlacklisted() → GET bl:{token}                                                              
 2. User cache kontrolu → GET auth:user:{id}                                                           
 3. Cache miss ise → SETEX auth:user:{id}                                                              
                                                                                                       
 Ortalama: 2-3 Redis cagrisi PER REQUEST!                                                              
 ```                                                                                                   
                                                                                                       
 **Etki:** 1000 request/saat = 2000-3000 Redis cagrisi sadece auth icin                                
                                                                                                       
 #### SORUN 2: KEYS Komutu Kullanimi (BLOCKING!)                                                       
 **Dosya:** `backend/middleware/redisCache.js:56`                                                      
                                                                                                       
 ```javascript                                                                                         
 const keys = await getConnection().keys(`cache:${keyPattern}*`);                                      
 ```                                                                                                   
                                                                                                       
 **Tehlike:**                                                                                          
 - KEYS komutu O(N) karmasiklikta, tum key'leri tarar                                                  
 - Production'da binlerce key varken Redis'i bloke eder                                                
 - Supabase Redis'te ratelimit'e neden olur                                                            
                                                                                                       
 #### SORUN 3: Dusuk TTL Degerleri                                                                     
                                                                                                       
 | Cache Tipi | Mevcut TTL | Sorun |                                                                   
 |------------|------------|-------|                                                                   
 | `auth:user` | 60s | Her dakika kullanici icin yeni cache |                                          
 | `stats:user` | 60s | Dashboard her dakika cache miss |                                              
 | `content:history` | 120s | Cok kisa, surekli yeniden cache |                                        
 | `sub:plans` | 1800s | Kabul edilebilir |                                                            
                                                                                                       
 #### SORUN 4: Pipeline/MGET Kullanilmiyor                                                             
 Her islem ayri Redis roundtrip'i gerektiriyor. Batch islemler yapilmiyor.                             
                                                                                                       
 #### SORUN 5: L1 (In-Memory) Cache Yok                                                                
 Redis'e gitmeden once local memory cache kontrolu yok.                                                
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 2. Iyilestirme Plani                                                                               
                                                                                                       
 ### FAZ 1: Acil Mudahaleler (Yuksek Oncelik)                                                          
                                                                                                       
 #### 1.1 KEYS Komutunu SCAN ile Degistir                                                              
 **Dosya:** `backend/middleware/redisCache.js`                                                         
                                                                                                       
 ```javascript                                                                                         
 // ONCE (TEHLIKELI!)                                                                                  
 const keys = await getConnection().keys(`cache:${keyPattern}*`);                                      
                                                                                                       
 // SONRA (GUVENLI)                                                                                    
 const invalidateCache = async (keyPattern) => {                                                       
   if (!checkRedisAvailability()) return;                                                              
                                                                                                       
   const redis = getConnection();                                                                      
   const fullPattern = `cache:${keyPattern}*`;                                                         
   let cursor = '0';                                                                                   
   let totalDeleted = 0;                                                                               
                                                                                                       
   do {                                                                                                
     const [newCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);           
     cursor = newCursor;                                                                               
                                                                                                       
     if (keys.length > 0) {                                                                            
       await redis.del(...keys);                                                                       
       totalDeleted += keys.length;                                                                    
     }                                                                                                 
   } while (cursor !== '0');                                                                           
                                                                                                       
   logger.debug(`[CACHE] Invalidated ${totalDeleted} keys for pattern: ${keyPattern}`);                
 };                                                                                                    
 ```                                                                                                   
                                                                                                       
 **Kazanim:** Redis blocking onlenir, ratelimit azalir                                                 
                                                                                                       
 #### 1.2 TTL Degerlerini Artir                                                                        
                                                                                                       
 | Cache Tipi | Eski TTL | Yeni TTL | Aciklama |                                                       
 |------------|----------|----------|----------|                                                       
 | `auth:user` | 60s | 300s (5 dk) | Kullanici verisi nadiren degisir |                                
 | `stats:user` | 60s | 300s (5 dk) | Dashboard stats anlık olmasina gerek yok |                       
 | `content:history` | 120s | 600s (10 dk) | History nadir guncellenir |                               
 | `sectors:all` | 3600s | 7200s (2 saat) | Sektorler cok nadir degisir |                              
 | `params:all` | 3600s | 86400s (24 saat) | Parametreler neredeyse hic degismez |                     
                                                                                                       
 **Kazanim:** Cache hit orani artar, Redis cagrisi azalir                                              
                                                                                                       
 #### 1.3 Auth User Cache TTL Guncelle                                                                 
 **Dosya:** `backend/middleware/auth.js:116`                                                           
                                                                                                       
 ```javascript                                                                                         
 // ONCE                                                                                               
 await getConnection().setex(cacheKey, 60, JSON.stringify(user));                                      
                                                                                                       
 // SONRA                                                                                              
 await getConnection().setex(cacheKey, 300, JSON.stringify(user));                                     
 ```                                                                                                   
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ### FAZ 2: L1 Memory Cache Ekle (Orta Oncelik)                                                        
                                                                                                       
 #### 2.1 Hibrit Cache Stratejisi                                                                      
                                                                                                       
 ```                                                                                                   
 Request → L1 (Memory, 30s) → L2 (Redis, 5dk) → Database                                               
 ```                                                                                                   
                                                                                                       
 **Yeni Dosya:** `backend/utils/cache/memoryCache.js`                                                  
                                                                                                       
 ```javascript                                                                                         
 const NodeCache = require('node-cache');                                                              
                                                                                                       
 // L1 Memory Cache - cok kisa TTL, yuksek hit rate                                                    
 const memoryCache = new NodeCache({                                                                   
   stdTTL: 30,           // 30 saniye default                                                          
   checkperiod: 60,      // 60 saniyede bir temizlik                                                   
   maxKeys: 5000,        // Max 5000 key                                                               
   useClones: false      // Performance icin clone yapma                                               
 });                                                                                                   
                                                                                                       
 module.exports = {                                                                                    
   get: (key) => memoryCache.get(key),                                                                 
   set: (key, value, ttl) => memoryCache.set(key, value, ttl),                                         
   del: (key) => memoryCache.del(key),                                                                 
   flush: () => memoryCache.flushAll(),                                                                
   stats: () => memoryCache.getStats()                                                                 
 };                                                                                                    
 ```                                                                                                   
                                                                                                       
 #### 2.2 Hibrit Cache Middleware                                                                      
                                                                                                       
 **Yeni Dosya:** `backend/middleware/hybridCache.js`                                                   
                                                                                                       
 ```javascript                                                                                         
 const memoryCache = require('../utils/cache/memoryCache');                                            
 const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient');            
 const logger = require('../utils/common/logger');                                                     
                                                                                                       
 const hybridCache = (keyPrefix, redisTtl, memoryTtl = 30) => async (req, res, next) => {              
   const userId = req.user?.id || 'global';                                                            
   const cacheKey = `cache:${keyPrefix}:${userId}`;                                                    
                                                                                                       
   // L1: Memory Cache kontrolu                                                                        
   const memoryCached = memoryCache.get(cacheKey);                                                     
   if (memoryCached) {                                                                                 
     res.set('X-Cache', 'HIT-L1');                                                                     
     return res.json(memoryCached);                                                                    
   }                                                                                                   
                                                                                                       
   // L2: Redis Cache kontrolu                                                                         
   if (checkRedisAvailability()) {                                                                     
     try {                                                                                             
       const redisCached = await getConnection().get(cacheKey);                                        
       if (redisCached) {                                                                              
         const data = JSON.parse(redisCached);                                                         
         // L1'e yaz (sonraki istekler icin)                                                           
         memoryCache.set(cacheKey, data, memoryTtl);                                                   
         res.set('X-Cache', 'HIT-L2');                                                                 
         return res.json(data);                                                                        
       }                                                                                               
     } catch (err) {                                                                                   
       logger.debug(`[HYBRID-CACHE] Redis error: ${err.message}`);                                     
     }                                                                                                 
   }                                                                                                   
                                                                                                       
   // Cache miss - response'u intercept et                                                             
   const originalJson = res.json.bind(res);                                                            
   res.json = (body) => {                                                                              
     if (res.statusCode === 200) {                                                                     
       // L1'e yaz                                                                                     
       memoryCache.set(cacheKey, body, memoryTtl);                                                     
                                                                                                       
       // L2'ye yaz (async)                                                                            
       if (checkRedisAvailability()) {                                                                 
         getConnection()                                                                               
           .setex(cacheKey, redisTtl, JSON.stringify(body))                                            
           .catch(err => logger.debug(`[HYBRID-CACHE] Redis write error: ${err.message}`));            
       }                                                                                               
     }                                                                                                 
     res.set('X-Cache', 'MISS');                                                                       
     return originalJson(body);                                                                        
   };                                                                                                  
                                                                                                       
   next();                                                                                             
 };                                                                                                    
                                                                                                       
 module.exports = { hybridCache };                                                                     
 ```                                                                                                   
                                                                                                       
 **Kazanim:** Redis cagrisi %60-80 azalir (L1 hit rate)                                                
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ### FAZ 3: Auth Optimizasyonlari (Orta Oncelik)                                                       
                                                                                                       
 #### 3.1 Token Blacklist Optimizasyonu                                                                
                                                                                                       
 Mevcut JWT TTL: 15 dakika. Cogu token blacklist kontrolu gereksiz.                                    
                                                                                                       
 **Strateji:** Sadece logout sonrasi blacklist kontrolu yap, normal akista JWT signature kontrolu      
 yeterli.                                                                                              
                                                                                                       
 ```javascript                                                                                         
 // Auth middleware'de blacklist kontrolunu JWT exp'e gore optimize et                                 
 async function isTokenBlacklisted(token) {                                                            
   // JWT decode (verify degil, sadece decode)                                                         
   const decoded = jwt.decode(token);                                                                  
   if (!decoded || !decoded.exp) return false;                                                         
                                                                                                       
   // Token 5 dakikadan az kaldiyla zaten expire olacak, blacklist kontrolune gerek yok                
   const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);                                
   if (timeUntilExpiry < 300) return false;                                                            
                                                                                                       
   // Redis kontrolu                                                                                   
   if (!checkRedisAvailability()) return false;                                                        
   try {                                                                                               
     const result = await getConnection().get(`bl:${token}`);                                          
     return result === '1';                                                                            
   } catch {                                                                                           
     return false;                                                                                     
   }                                                                                                   
 }                                                                                                     
 ```                                                                                                   
                                                                                                       
 #### 3.2 User Cache Pipeline Kullanimi                                                                
                                                                                                       
 ```javascript                                                                                         
 // Birden fazla user'i ayni anda cache'le                                                             
 const getUsersFromCache = async (userIds) => {                                                        
   if (!checkRedisAvailability()) return {};                                                           
                                                                                                       
   const keys = userIds.map(id => `auth:user:${id}`);                                                  
   const values = await getConnection().mget(...keys);                                                 
                                                                                                       
   const result = {};                                                                                  
   values.forEach((val, i) => {                                                                        
     if (val) result[userIds[i]] = JSON.parse(val);                                                    
   });                                                                                                 
   return result;                                                                                      
 };                                                                                                    
 ```                                                                                                   
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ### FAZ 4: BullMQ Optimizasyonlari (Dusuk Oncelik)                                                    
                                                                                                       
 #### 4.1 Queue Stats Caching                                                                          
                                                                                                       
 ```javascript                                                                                         
 // Queue stats'i cache'le, her seferinde Redis'e sorma                                                
 let cachedStats = null;                                                                               
 let cacheTime = 0;                                                                                    
                                                                                                       
 const getAllQueueStats = async () => {                                                                
   const now = Date.now();                                                                             
                                                                                                       
   // 30 saniyelik cache                                                                               
   if (cachedStats && (now - cacheTime) < 30000) {                                                     
     return cachedStats;                                                                               
   }                                                                                                   
                                                                                                       
   // Yeni stats al                                                                                    
   const queueNames = ['tts-processing', 'podcast-processing', 'mfa-alignment'];                       
   const stats = {};                                                                                   
                                                                                                       
   for (const name of queueNames) {                                                                    
     stats[name] = await getQueueStats(name);                                                          
   }                                                                                                   
                                                                                                       
   cachedStats = stats;                                                                                
   cacheTime = now;                                                                                    
                                                                                                       
   return stats;                                                                                       
 };                                                                                                    
 ```                                                                                                   
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 3. Uygulama Sirasi                                                                                 
                                                                                                       
 | Oncelik | Gorev | Etki | Tahmini Sure |                                                             
 |---------|-------|------|--------------|                                                             
 | 1 (KRITIK) | KEYS → SCAN degisikligi | Blocking onlenir | 30 dk |                                   
 | 2 (YUKSEK) | TTL degerlerini artir | %30-40 cagri azalir | 15 dk |                                  
 | 3 (YUKSEK) | L1 Memory Cache ekle | %60-80 cagri azalir | 2 saat |                                  
 | 4 (ORTA) | Auth blacklist optimizasyonu | %10-20 cagri azalir | 1 saat |                            
 | 5 (DUSUK) | BullMQ stats caching | %5 cagri azalir | 30 dk |                                        
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 4. Beklenen Sonuclar                                                                               
                                                                                                       
 ### Onceki Durum (Tahmini)                                                                            
 - Her request: 3-5 Redis cagrisi                                                                      
 - 1000 request/saat = 3000-5000 Redis cagrisi                                                         
 - Gunluk: ~100k+ Redis cagrisi                                                                        
                                                                                                       
 ### Sonraki Durum (Hedef)                                                                             
 - L1 cache hit rate: %70                                                                              
 - Her request: 0.5-1 Redis cagrisi (ortalama)                                                         
 - 1000 request/saat = 500-1000 Redis cagrisi                                                          
 - Gunluk: ~20-30k Redis cagrisi                                                                       
                                                                                                       
 **Hedef Azalma: %70-80**                                                                              
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 5. Monitoring ve Metrikler                                                                         
                                                                                                       
 ### Izlenmesi Gereken Metrikler                                                                       
                                                                                                       
 ```javascript                                                                                         
 // Redis metrik toplama                                                                               
 const redisMetrics = {                                                                                
   totalCalls: 0,                                                                                      
   l1Hits: 0,                                                                                          
   l2Hits: 0,                                                                                          
   misses: 0,                                                                                          
   errors: 0                                                                                           
 };                                                                                                    
                                                                                                       
 // Her 5 dakikada bir logla                                                                           
 setInterval(() => {                                                                                   
   logger.info('[REDIS_METRICS]', {                                                                    
     ...redisMetrics,                                                                                  
     l1HitRate: (redisMetrics.l1Hits / redisMetrics.totalCalls * 100).toFixed(2) + '%',                
     l2HitRate: (redisMetrics.l2Hits / redisMetrics.totalCalls * 100).toFixed(2) + '%'                 
   });                                                                                                 
   // Reset                                                                                            
   Object.keys(redisMetrics).forEach(k => redisMetrics[k] = 0);                                        
 }, 5 * 60 * 1000);                                                                                    
 ```                                                                                                   
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 6. Test Plani                                                                                      
                                                                                                       
 ### 6.1 Yuk Testi                                                                                     
                                                                                                       
 ```bash                                                                                               
 # Artillery veya k6 ile test                                                                          
 # 1000 concurrent user, 5 dakika                                                                      
 artillery run load-test.yml                                                                           
 ```                                                                                                   
                                                                                                       
 ### 6.2 Redis Monitoring                                                                              
                                                                                                       
 ```bash                                                                                               
 # Redis CLI ile izleme                                                                                
 redis-cli monitor | grep -E "(GET|SET|KEYS|DEL)"                                                      
                                                                                                       
 # Komut istatistikleri                                                                                
 redis-cli INFO commandstats                                                                           
 ```                                                                                                   
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 7. Rollback Plani                                                                                  
                                                                                                       
 Her degisiklik icin feature flag kullan:                                                              
                                                                                                       
 ```javascript                                                                                         
 // Environment variables                                                                              
 ENABLE_HYBRID_CACHE=true                                                                              
 ENABLE_AUTH_CACHE_OPTIMIZATION=true                                                                   
 NEW_AUTH_TTL=300                                                                                      
 ```                                                                                                   
                                                                                                       
 Sorun durumunda env variable'i false yaparak eski davranisa don.                                      
                                                                                                       
 ---                                                                                                   
                                                                                                       
 ## 8. Sonraki Adimlar                                                                                 
                                                                                                       
 1. [ ] FAZ 1 degisikliklerini uygula                                                                  
 2. [ ] Production'da Redis monitoring aktif et                                                        
 3. [ ] 24 saat izle, metrikleri topla                                                                 
 4. [ ] FAZ 2 degisikliklerini uygula                                                                  
 5. [ ] Sonuclari dokumente et                                                                         
                                   






                                   7. Test Senaryoları                                                                                 │
│                                                                                                     │
│ - OpenAI API key yanlış → süreç durur, admin email + user push gönderilir                           │
│ - Rate limit (429) → retry yapılır, 3. denemede admin email                                         │
│ - Google TTS hatası → süreç durur, user push gönderilir                                             │
│ - Network hatası → user push "geçici sorun" mesajıyla gönderilir                                    │
│ - Mevcut başarılı akış bozulmadı                                                                    │
│                                      