const axios = require('axios');

module.exports = {
    name: 'mcserver',
    alias: ['minecraft', 'checkmc'],
    category: 'utility',
    description: 'Mengecek status server Minecraft berdasarkan IP menggunakan mcstatus.io.',
    usage: '!mcserver <ip>[:port] (contoh: !mcserver play.hypixel.net)',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        // Validasi input
        if (args.length < 1) {
            return await sock.sendMessage(groupId, {
                text: '❌ Masukkan IP server Minecraft!\nContoh: !mcserver play.hypixel.net'
            });
        }

        // Ambil IP dan port (jika ada)
        const input = args[0];
        const [host, port] = input.split(':');
        const address = port ? `${host}:${port}` : host;

        // Beri reaksi loading
        await sock.sendMessage(groupId, { react: { text: "⏳", key: msg.key } });

        try {
            // Request status server
            const statusUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}`;
            const statusResponse = await axios.get(statusUrl);
            const statusData = statusResponse.data;

            // Log respons untuk debugging
            console.log('Respons API mcstatus.io:', JSON.stringify(statusData, null, 2));

            // Cek apakah server online
            if (!statusData.online) {
                await sock.sendMessage(groupId, {
                    text: `❌ Server *${address}* sedang offline atau tidak ditemukan!`
                });
                await sock.sendMessage(groupId, { react: { text: "⚠️", key: msg.key } });
                return;
            }

            // Format informasi server
            let resultText = `✅ *Status Server Minecraft: ${address}*\n\n` +
                            `📡 *Host:* ${statusData.host}\n` +
                            `🔌 *Port:* ${statusData.port}\n` +
                            `🌐 *IP:* ${statusData.ip_address || 'Tidak tersedia'}\n` +
                            `📶 *Latensi:* ${statusData.ping} ms (dari API, mungkin tidak akurat)\n` +
                            `👥 *Pemain:* ${statusData.players.online}/${statusData.players.max}\n` +
                            `🎮 *Versi:* ${statusData.version.name_clean} (Protokol: ${statusData.version.protocol})\n` +
                            `📝 *MOTD:* ${statusData.motd.clean}\n` +
                            (statusData.eula_blocked ? `⚠️ *EULA Blocked:* Ya` : `✅ *EULA Blocked:* Tidak`) + `\n` +
                            (statusData.icon ? `🖼️ *Icon:* Ada` : `🖼️ *Icon:* Tidak ada`);

            // Tampilkan sample pemain jika ada
            if (statusData.players.list && statusData.players.list.length > 0) {
                resultText += `\n\n👤 *Sample Pemain (${statusData.players.list.length}):*`;
                statusData.players.list.slice(0, 5).forEach(player => {
                    resultText += `\n- ${player.name_clean} (UUID: ${player.uuid})`;
                });
            }

            // Tampilkan mod jika ada, beri pesan jika kosong
            if (statusData.mods && statusData.mods.length > 0) {
                resultText += `\n\n🔧 *Mod (${statusData.mods.length}):*`;
                statusData.mods.forEach(mod => {
                    resultText += `\n- ${mod.name} (${mod.version || 'Versi tidak tersedia'})`;
                });
            } else {
                resultText += `\n\n🔧 *Mod:* Tidak terdeteksi (server mungkin tidak mengexpose data mod)`;
            }

            // Tampilkan plugin jika ada
            if (statusData.plugins && statusData.plugins.length > 0) {
                resultText += `\n\n🔌 *Plugin (${statusData.plugins.length}):*`;
                statusData.plugins.forEach(plugin => {
                    resultText += `\n- ${plugin.name} (${plugin.version || 'Versi tidak tersedia'})`;
                });
            }

            // Tambah info software jika ada
            if (statusData.software) {
                resultText += `\n\n💾 *Software:* ${statusData.software}`;
            }

            // Tambah info SRV record jika ada
            if (statusData.srv_record) {
                resultText += `\n\n📡 *SRV Record:*\n- Host: ${statusData.srv_record.host}\n- Port: ${statusData.srv_record.port}`;
            }

            // Request widget gambar dengan parameter
            const widgetUrl = `https://api.mcstatus.io/v2/widget/java/${encodeURIComponent(address)}?dark=true&rounded=true&transparent=false&timeout=5`;
            const widgetResponse = await axios.get(widgetUrl, { responseType: 'arraybuffer' });
            const widgetBuffer = Buffer.from(widgetResponse.data, 'binary');

            // Kirim gambar widget dengan caption
            await sock.sendMessage(groupId, {
                image: widgetBuffer,
                caption: resultText
            });

            // Beri reaksi sukses
            await sock.sendMessage(groupId, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Gagal memeriksa server Minecraft:', error);

            // Tangani error spesifik
            let errorMsg = '❌ Gagal memeriksa server!';
            if (error.response?.status === 404) {
                errorMsg = '❌ Server tidak ditemukan! Pastikan IP benar.';
            } else if (error.response?.status === 520) {
                errorMsg = '❌ Error 520: Masalah server API atau server Minecraft tidak merespons. Coba lagi nanti!';
            } else if (error.code === 'ECONNABORTED') {
                errorMsg = '❌ Server tidak merespons (timeout)!';
            } else if (error.code === 'ECONNREFUSED') {
                errorMsg = '❌ Koneksi ditolak! Server mungkin offline.';
            }

            await sock.sendMessage(groupId, { text: errorMsg });
            await sock.sendMessage(groupId, { react: { text: "⚠️", key: msg.key } });
        }
    }
};