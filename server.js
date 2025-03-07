// Varsayılan durum verisi
const DEFAULT_STATUS = "1:0:0;2:0:0;3:0:0";

// CORS başlıkları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Veritabanı başlatma fonksiyonu
async function initializeDatabase(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS status (
        id INTEGER PRIMARY KEY,
        data TEXT NOT NULL
      )
    `).run();

    const existingData = await env.DB.prepare(
      "SELECT * FROM status WHERE id = 1"
    ).first();

    if (!existingData) {
      await env.DB.prepare(
        "INSERT INTO status (id, data) VALUES (?, ?)"
      ).bind(1, DEFAULT_STATUS).run();
    }
  } catch (error) {
    console.error('DB initialization error:', error);
  }
}

// Ana handler
export default {
  async fetch(request, env, ctx) {
    // CORS için OPTIONS isteğini yanıtla
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Veritabanını başlat
    await initializeDatabase(env);

    const url = new URL(request.url);

    // API endpoint'leri
    if (url.pathname === '/api/status') {
      try {
        const result = await env.DB.prepare(
          "SELECT data FROM status WHERE id = 1"
        ).first();

        return new Response(
          result.data,
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain'
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    if (url.pathname === '/api/update') {
      const button = url.searchParams.get('button');

      try {
        const currentData = await env.DB.prepare(
          "SELECT data FROM status WHERE id = 1"
        ).first();

        const values = currentData.data.split(';').map(item => item.split(':'));

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
            return new Response(
              JSON.stringify({ error: 'Geçersiz buton parametresi' }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json'
                }
              }
            );
        }

        const newData = values.map(v => v.join(':')).join(';');

        await env.DB.prepare(
          "UPDATE status SET data = ? WHERE id = 1"
        ).bind(newData).run();

        // 3 saniye sonra sıfırlama için
        ctx.waitUntil(
          new Promise(resolve => {
            setTimeout(async () => {
              try {
                await env.DB.prepare(
                  "UPDATE status SET data = ? WHERE id = 1"
                ).bind(DEFAULT_STATUS).run();
                resolve();
              } catch (error) {
                console.error('Reset error:', error);
                resolve();
              }
            }, 3000);
          })
        );

        return new Response(
          JSON.stringify({ status: 'success', newData }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
}; 