const fetch = require('node-fetch');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const fetchCookie = require('fetch-cookie').default;

const cookieJar = new tough.CookieJar();
const fetchWithCookies = fetchCookie(fetch, cookieJar);

module.exports = {
    name: 'igsdl',
    category: 'media',
    description: 'Mengunduh Instagram Story dari indown.io tanpa Puppeteer',
    usage: '!igsdl <username>',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            if (!args[0]) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '✳️ Masukkan username Instagram setelah perintah\nContoh: !igsdl nurulvta'
                });
            }

            const username = args[0].trim().replace('@', '');
            const usernameRegex = /^[A-Za-z0-9._]+$/;
            if (!username.match(usernameRegex)) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Username tidak valid. Gunakan huruf, angka, titik (.), atau garis bawah (_) saja.'
                });
            }

            const profileUrl = `https://www.instagram.com/${username}/`;
            console.log(`[DEBUG] Profile URL: ${profileUrl}`);

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            // Langkah 1: Ambil halaman awal untuk token CSRF dan cookie
            console.log('[DEBUG] Mengambil halaman awal untuk token CSRF dan cookie');
            const initialResponse = await fetchWithCookies('https://indown.io/insta-stories-download/id', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });
            if (!initialResponse.ok) {
                throw new Error(`Gagal mengambil halaman awal: ${initialResponse.status} - ${initialResponse.statusText}`);
            }

            const initialHtml = await initialResponse.text();
            const $initial = cheerio.load(initialHtml);
            const token = $initial('input[name="_token"]').attr('value');
            if (!token) {
                throw new Error('Token CSRF tidak ditemukan di halaman');
            }
            console.log('[DEBUG] Token CSRF:', token);

            // Langkah 2: Simulasi POST request dengan cookie
            const formData = new URLSearchParams({
                referer: 'https://indown.io/insta-stories-download/id',
                locale: 'id',
                p: '125.160.125.62',
                _token: token,
                link: profileUrl
            });

            console.log('[DEBUG] Mengirim POST request ke indown.io');
            const response = await fetchWithCookies('https://indown.io/download', {
                method: 'POST',
                body: formData,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Origin': 'https://indown.io',
                    'Referer': 'https://indown.io/insta-stories-download/id'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log('[DEBUG] Response error body:', errorText.slice(0, 500));
                throw new Error(`Gagal fetch data: ${response.status} - ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Langkah 3: Ambil URL Stories dari hasil
            console.log('[DEBUG] Mengambil URL Stories');
            const storyUrls = [];
            $('#result video source').each((i, elem) => {
                const url = $(elem).attr('src');
                if (url) storyUrls.push({ url, type: 'video' });
            });
            $('#result a[href]').each((i, elem) => {
                const url = $(elem).attr('href');
                if (url && url.includes('instagram.f')) {
                    storyUrls.push({ url, type: 'video' });
                }
            });

            if (!storyUrls.length) {
                throw new Error('Tidak ada Story yang ditemukan untuk username ini');
            }

            console.log('[DEBUG] Jumlah Stories ditemukan:', storyUrls.length);

            // Langkah 4: Unduh satu URL dengan fallback
            let processedCount = 0;
            for (const story of storyUrls) {
                // Prioritaskan URL Instagram langsung
                if (!story.url.includes('instagram.f')) continue; // Lewati URL non-Instagram

                console.log('[DEBUG] Mengunduh:', story.url);
                const mediaResponse = await fetch(story.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (!mediaResponse.ok) {
                    console.error(`[DEBUG] Gagal mengunduh: ${story.url} - ${mediaResponse.status}`);
                    continue; // Coba URL berikutnya jika gagal
                }

                const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
                if (mediaBuffer.length === 0) {
                    console.error(`[DEBUG] Buffer kosong untuk: ${story.url}`);
                    continue;
                }

                const mediaType = story.type;
                const fileName = `${username}_story.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
                const mimetype = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

                await sock.sendMessage(msg.key.remoteJid, {
                    [mediaType]: mediaBuffer,
                    mimetype,
                    caption: `*Instagram Story*\n👤 Username: ${username}\n📌 Tipe: ${mediaType === 'video' ? 'Video' : 'Foto'}`,
                    fileName
                }, { quoted: msg });

                processedCount++;
                break; // Keluar dari loop setelah satu berhasil
            }

            if (processedCount === 0) {
                throw new Error('Tidak ada media yang berhasil diunduh');
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('[ERROR]', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengunduh story: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};