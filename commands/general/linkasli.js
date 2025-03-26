const config = require('../../config.json');
const axios = require('axios');

module.exports = {
    name: 'ceklink',
    alias: ['linkasli', 'rillkah'],
    category: 'utility',
    description: 'Memeriksa link asli dari redirect link dengan opsi full redirect chain',
    usage: '!ceklink <url> [full]',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Ambil URL dan parameter full dari argumen
            const input = args.join(' ').trim().split(' ');
            let url = input[0];
            const showFull = input[1]?.toLowerCase() === 'full'; // Cek apakah ada parameter "full"

            // Validasi input
            if (!url) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan URL untuk diperiksa!\n\n' +
                          '⚠️ *Format:* !ceklink <url> [full]\n' +
                          '✅ Contoh: !ceklink s.id/plthinker\n' +
                          '✅ Contoh Full: !ceklink s.id/plthinker full'
                });
            }

            // Jika tidak ada protokol, mulai dari http:// untuk deteksi redirect penuh
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url; // Mulai dari http:// untuk tangkap redirect ke https://
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Konfigurasi axios untuk mengikuti redirect dan menyimpan rantai
            const redirectChain = [];
            const instance = axios.create({
                maxRedirects: 0, // Tidak otomatis ikuti redirect
                validateStatus: () => true, // Terima semua status kode
            });

            let currentUrl = url;
            let response;

            // Ikuti redirect secara manual
            while (true) {
                response = await instance.get(currentUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' } // Tambahkan User-Agent agar mirip browser
                });
                const status = response.status;

                if (status >= 300 && status < 400 && response.headers.location) {
                    const nextUrl = response.headers.location;
                    const fullNextUrl = nextUrl.startsWith('http') ? nextUrl : new URL(nextUrl, currentUrl).href;
                    redirectChain.push({
                        from: currentUrl,
                        to: fullNextUrl,
                        status: `${status} - ${status === 301 || status === 308 ? 'Permanent Redirect' : 'Temporary Redirect'}`
                    });
                    currentUrl = fullNextUrl;
                } else {
                    break; // Tidak ada redirect lagi, keluar dari loop
                }

                // Batasi jumlah redirect untuk mencegah infinite loop
                if (redirectChain.length > 10) {
                    throw new Error('Terlalu banyak redirect (maksimum 10).');
                }
            }

            const finalUrl = currentUrl;

            // Format pesan berdasarkan parameter full
            let message;
            if (showFull && redirectChain.length > 0) {
                message = '🔗 *Redirect Chain:*\n';
                // Tampilkan URL awal
                message += `${redirectChain[0].from}\n`;
                // Tampilkan setiap langkah redirect
                redirectChain.forEach((step) => {
                    message += `⬇️ ${step.status}\n${step.to}\n`;
                });
                message += `⬆️ *Final Destination*\n`;
            } else {
                message = `🔗 *Link Asli:*\n${finalUrl}\n\n📋 *Input:* ${url}`;
            }

            // Kirim hasil
            await sock.sendMessage(msg.key.remoteJid, { text: message });
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing ceklink command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal memeriksa redirect: ' + (error.message || 'Terjadi kesalahan saat mengikuti redirect.')
            });
        }
    }
};