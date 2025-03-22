const util = require('minecraft-server-util');

module.exports = {
    name: 'mcserver',
    alias: ['minecraft', 'checkmc'],
    category: 'general',
    description: 'Mengecek status server Minecraft berdasarkan IP.',
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
        const input = args[0].split(':');
        const host = input[0];
        const port = input[1] ? parseInt(input[1]) : 25565; // Port default Minecraft

        // Validasi port
        if (isNaN(port) || port < 1 || port > 65535) {
            return await sock.sendMessage(groupId, {
                text: '❌ Port tidak valid! Gunakan port antara 1-65535.'
            });
        }

        // Beri reaksi loading
        await sock.sendMessage(groupId, { react: { text: "⏳", key: msg.key } });

        try {
            // Ping server Minecraft
            const status = await util.status(host, port, {
                timeout: 5000 // Timeout 5 detik
            });

            // Format informasi server
            const resultText = `✅ *Status Server Minecraft: ${host}:${port}*\n\n` +
                              `📶 *Latensi:* ${status.roundTripLatency} ms\n` +
                              `👥 *Pemain:* ${status.players.online}/${status.players.max}\n` +
                              `🎮 *Versi:* ${status.version.name}\n` +
                              `🌐 *MOTD:* ${status.motd.clean}\n` +
                              (status.favicon ? `🖼️ *Favicon:* Ada` : `🖼️ *Favicon:* Tidak ada`);

            // Kirim hasil
            await sock.sendMessage(groupId, {
                text: resultText
            });

            // Beri reaksi sukses
            await sock.sendMessage(groupId, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Gagal ping server Minecraft:', error);

            // Tangani error spesifik
            let errorMsg = '❌ Gagal memeriksa server!';
            if (error.code === 'ENOTFOUND') {
                errorMsg = '❌ Server tidak ditemukan! Pastikan IP benar.';
            } else if (error.code === 'ETIMEDOUT') {
                errorMsg = '❌ Server tidak merespons (timeout)!';
            } else if (error.message.includes('connect ECONNREFUSED')) {
                errorMsg = '❌ Koneksi ditolak! Server mungkin offline.';
            }

            await sock.sendMessage(groupId, { text: errorMsg });
            await sock.sendMessage(groupId, { react: { text: "⚠️", key: msg.key } });
        }
    }
};