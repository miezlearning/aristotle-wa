const fs = require('fs');
const path = './data/absensi.json';

// Memuat atau membuat file absensi
const loadAbsensi = () => {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
};

// Menyimpan data absensi
const saveAbsensi = (data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'absen',
    category: 'fun', // Diubah ke 'fun' karena ini command fun
    description: 'Mencatat kehadiran pengguna dan menampilkan statistik absen.',
    usage: '!absen | !absen stats', // Usage diperbaiki
    permission: 'member',
    async execute(sock, msg, args) {
        const senderName = msg.pushName || 'User'; // Nama Pengirim (Username)
        const userId = msg.key.participant || msg.key.remoteJid; // WhatsApp ID

        let absensi = loadAbsensi();

        if (args[0] === 'stats' || args[0] === 'statistik' || args[0] === 'stat') { // Tambahan alias untuk stats
            // Menampilkan statistik absensi
            let ranking = Object.entries(absensi)
                .map(([idUsername, data]) => ({ // Ubah cara mapping, key jadi idUsername
                    username: data.username, // Ambil username dari data
                    count: data.count
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            let statsMessage = `📊 *Statistik Absensi* 📊\n\n`;
            if (ranking.length > 0) {
                statsMessage += ranking.map((entry, i) => `${i + 1}. *${entry.username}* - ${entry.count} kali`).join('\n');
            } else {
                statsMessage += `Belum ada yang absen. Ayo absen!`;
            }
            statsMessage += `\n\nGunakan *!absen* untuk mencatat kehadiranmu!`;

            return await sock.sendMessage(msg.key.remoteJid, { text: statsMessage }, { quoted: msg });
        }

        // Mencatat absensi pengguna
        if (!absensi[userId]) {
            // Jika user belum pernah absen, inisialisasi data user
            absensi[userId] = {
                username: senderName, // Simpan username di sini
                count: 0
            };
        }
        absensi[userId].count += 1; // Increment count untuk user yang sudah ada atau baru
        saveAbsensi(absensi);

        let message = `✅ *${senderName}* telah absen!\nTotal absen: ${absensi[userId].count} kali.`; // Ambil count dari data user
        await sock.sendMessage(msg.key.remoteJid, { text: message }, { quoted: msg });
    }
};