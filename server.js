const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Varsayılan durum verisi
const DEFAULT_STATUS = "1,0,0;2,0,0;3,0,0";

// Aktif zamanlayıcıyı tutacak değişken
let activeTimer = null;

// SQLite veritabanı bağlantısı
const db = new sqlite3.Database('status.db', (err) => {
    if (err) {
        console.error('Veritabanına bağlanırken hata:', err.message);
    } else {
        console.log('SQLite veritabanına bağlandı');
        // Status tablosunu oluştur
        db.run(`CREATE TABLE IF NOT EXISTS status (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Tablo oluşturulurken hata:', err.message);
            } else {
                // Başlangıç verisini ekle (eğer yoksa)
                db.get("SELECT * FROM status WHERE id = 1", (err, row) => {
                    if (!row) {
                        db.run("INSERT INTO status (id, data) VALUES (?, ?)", [1, DEFAULT_STATUS]);
                    }
                });
            }
        });
    }
});

// Durumu varsayılan değere sıfırlama fonksiyonu
function resetStatus() {
    return new Promise((resolve, reject) => {
        db.run("UPDATE status SET data = ? WHERE id = 1", [DEFAULT_STATUS], (err) => {
            if (err) {
                console.error('Sıfırlama hatası:', err);
                reject(err);
            } else {
                console.log('Durum başarıyla sıfırlandı:', DEFAULT_STATUS);
                resolve();
            }
        });
    });
}

// Arduino'nun çağıracağı endpoint - mevcut durumu döndürür
app.get('/api/status', (req, res) => {
    db.get("SELECT data FROM status WHERE id = 1", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ status: row.data });
    });
});

// Buton tıklaması simülasyonu için endpoint
app.get('/api/update', async (req, res) => {
    const { button } = req.query;
    
    try {
        // Eğer aktif bir zamanlayıcı varsa temizle
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }

        // Mevcut veriyi al
        const row = await new Promise((resolve, reject) => {
            db.get("SELECT data FROM status WHERE id = 1", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        let newData = row.data;
        const values = row.data.split(';').map(item => item.split(','));

        // Butona göre veriyi güncelle
        switch (button) {
            case 'kapaliOtopark':
                values[0] = ['1', '1', '0'];
                values[1] = ['2', '0', '0'];
                values[2] = ['3', '0', '0'];
                break;
            case 'acikOtopark':
                values[0] = ['1', '0', '0'];
                values[1] = ['2', '1', '0'];
                values[2] = ['3', '0', '0'];
                break;
            default:
                res.status(400).json({ error: 'Geçersiz buton parametresi' });
                return;
        }

        // Yeni veriyi string formatına çevir
        newData = values.map(v => v.join(',')).join(';');

        // Veritabanını güncelle
        await new Promise((resolve, reject) => {
            db.run("UPDATE status SET data = ? WHERE id = 1", [newData], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // 3 saniye sonra sıfırlama için yeni zamanlayıcı oluştur
        activeTimer = setTimeout(async () => {
            try {
                await resetStatus();
                activeTimer = null;
            } catch (error) {
                console.error('Sıfırlama sırasında hata:', error);
            }
        }, 3000);

        res.json({ status: 'success', newData });
    } catch (error) {
        console.error('İşlem hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
}); 