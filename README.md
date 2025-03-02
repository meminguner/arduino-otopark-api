# Arduino Otopark API Projesi

Bu proje, Arduino (W5100 Ethernet Shield) ile haberleşen bir API sunucusudur. Otopark durumlarını yönetmek için kullanılır.

## Özellikler

- Arduino'dan gelen GET isteklerini karşılama
- Otopark durumlarını SQLite veritabanında saklama
- Buton simülasyonu için API endpoint'leri
- CORS desteği

## Kurulum

1. Gerekli paketleri yükleyin:
```bash
npm install
```

2. Sunucuyu başlatın:
```bash
node server.js
```

## API Endpoint'leri

### GET /api/status
Arduino tarafından çağrılır ve mevcut durumu döndürür.

Örnek yanıt:
```json
{
    "status": "1,0,0;2,0,0;3,0,0"
}
```

### GET /api/update
Buton tıklaması simülasyonu için kullanılır.

Query parametreleri:
- `button`: "kapaliOtopark" veya "acikOtopark"

Örnek kullanım:
```
GET /api/update?button=kapaliOtopark
GET /api/update?button=acikOtopark
```

## Veritabanı

Proje SQLite veritabanı kullanır ve otomatik olarak `status.db` dosyasını oluşturur.

## Geliştirme

Proje Node.js ve Express kullanılarak geliştirilmiştir. Veritabanı olarak SQLite tercih edilmiştir. 