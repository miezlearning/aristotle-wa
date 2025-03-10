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
                    text: '✳️ Masukkan username Instagram setelah perintah\nContoh: !igsdl miezlipp'
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

            // Langkah 3: Ambil semua URL Stories hanya dari Server 2 (Instagram)
            console.log('[DEBUG] Mengambil URL Stories');
            const stories = [];
            const seenUrls = new Set();

            $('#result a[href]').each((i, link) => {
                const url = $(link).attr('href');
                // Hanya ambil URL yang langsung dari instagram.f*, bukan d2.indown.io
                if (url && url.startsWith('https://instagram.f') && !seenUrls.has(url)) {
                    const type = url.includes('.mp4') ? 'video' : url.includes('.jpg') ? 'image' : 'unknown';
                    if (type !== 'unknown') {
                        stories.push({ url, type });
                        seenUrls.add(url);
                    }
                }
            });

            if (!stories.length) {
                console.log('[DEBUG] HTML result:', html.slice(0, 1000)); // Log HTML untuk debugging
                throw new Error('Tidak ada Story yang ditemukan dengan URL Instagram');
            }

            console.log('[DEBUG] Jumlah Stories ditemukan:', stories.length);
            stories.forEach((story, i) => {
                console.log(`[DEBUG] Story ${i + 1}: ${story.url} (${story.type})`);
            });

            // Langkah 4: Unduh semua Stories
            let processedCount = 0;
            for (const story of stories) {
                console.log(`[DEBUG] Mengunduh Story ${processedCount + 1}: ${story.url}`);
                const mediaResponse = await fetch(story.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (!mediaResponse.ok) {
                    console.error(`[DEBUG] Gagal mengunduh Story ${processedCount + 1}: ${story.url} - ${mediaResponse.status}`);
                    continue;
                }

                const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
                if (mediaBuffer.length === 0) {
                    console.error(`[DEBUG] Buffer kosong untuk Story ${processedCount + 1}: ${story.url}`);
                    continue;
                }

                const mediaType = story.type;
                const fileName = `${username}_story_${processedCount + 1}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
                const mimetype = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

                await sock.sendMessage(msg.key.remoteJid, {
                    [mediaType]: mediaBuffer,
                    mimetype,
                    caption: `*Instagram Story*\n👤 Username: ${username}\n📌 Tipe: ${mediaType === 'video' ? 'Video' : 'Foto'}`,
                    fileName
                }, { quoted: msg });

                processedCount++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay antar unduhan
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