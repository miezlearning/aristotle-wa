const { scheduleMessage } = require('../../utils/scheduledMessageUtils'); // Import

module.exports = {
    name: 'schedule',
    description: 'Menjadwalkan pesan untuk dikirimkan pada waktu relatif atau waktu tertentu ke grup tertentu.',
    async execute(sock, msg, args) {
        if (args.length < 3) {
            return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Format perintah salah.  Gunakan: `!schedule [waktu relatif/jam:menit] [nama grup] [pesan]`' });
        }

        // Temukan indeks di mana argumen waktu berada (misalnya, 1m, 1h, 14:30)
        let timeArgIndex = -1;
        for (let i = 0; i < args.length; i++) {
            if (/^(\d+[smhd])|([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args[i])) {
                timeArgIndex = i;
                break;
            }
        }

        if (timeArgIndex === -1 || timeArgIndex === 0) {
            return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Format perintah salah. Nama grup harus diikuti oleh waktu." });
        }

        const groupName = args.slice(0, timeArgIndex).join(' '); // Gabungkan semua argumen sebelum waktu
        const timeArg = args[timeArgIndex];
        let message = args.slice(timeArgIndex + 1).join(' ');

        // Ekstrak Mention (PERUBAHAN DI SINI)
        const mentionRegex = /@([^@\s]+)/g; // Ubah regex
        const mentions = [];
        let match;

        while ((match = mentionRegex.exec(message)) !== null) {
            mentions.push(match[1]); // Nama pengguna tanpa @
        }

        // Cari Group ID berdasarkan nama
        let groupId;
        try {
            groupId = await findGroupIdByName(sock, groupName);
        } catch (error) {
            console.error("Error finding group by name:", error);
            return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menemukan grup dengan nama "${groupName}".` });
        }

        if (!groupId) {
            return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Grup dengan nama "${groupName}" tidak ditemukan.` });
        }

        let timestamp;

        // Cek format waktu relatif (contoh: 5m, 1h, 2d)
        const relativeTimeRegex = /^(\d+)([smhd])$/;
        const relativeTimeMatch = timeArg.match(relativeTimeRegex);

        if (relativeTimeMatch) {
            const value = parseInt(relativeTimeMatch[1]);
            const unit = relativeTimeMatch[2];

            let delayMs;

            switch (unit) {
                case 's': delayMs = value * 1000; break;
                case 'm': delayMs = value * 60 * 1000; break;
                case 'h': delayMs = value * 60 * 60 * 1000; break;
                case 'd': delayMs = value * 24 * 60 * 60 * 1000; break;
                default: return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Unit waktu relatif tidak valid (s, m, h, d)' });
            }

            timestamp = Date.now() + delayMs;

        } else {
            // Cek format waktu spesifik (contoh: 14:30)
            const specificTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!specificTimeRegex.test(timeArg)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Format waktu tidak valid. Gunakan format waktu relatif (5m) atau jam:menit (14:30).' });
            }

            const [hours, minutes] = timeArg.split(':').map(Number);
            const now = new Date();
            let targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

            // Jika waktu yang ditentukan sudah lewat hari ini, jadwalkan untuk besok
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            timestamp = targetTime.getTime();
        }

        if (timestamp <= Date.now()) {
            return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Waktu yang dijadwalkan sudah lewat.' });
        }
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Pesan dijadwalkan untuk dikirim ke grup "${groupName}" pada ${new Date(timestamp).toLocaleString()}` });
        const participantMentions = await getParticipantsFromUsernames(sock, groupId, mentions)
        scheduleMessage(sock, groupId, message, timestamp, participantMentions); // Gunakan scheduleMessage

    }
};

async function findGroupIdByName(sock, groupName) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        if (!groups) {
            console.warn("Tidak ada grup yang diikuti oleh bot.");
            return null;
        }

        for (const groupId in groups) {
            if (groups.hasOwnProperty(groupId)) {
                const group = groups[groupId];
                if (group.subject.trim() === groupName.trim()) {
                    return groupId;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Gagal mengambil info grup:", error);
        throw error; // Re-throw agar ditangani di execute
    }
}

async function getParticipantsFromUsernames(sock, groupId, usernames) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const participants = groupMetadata.participants;
        const mentions = [];

        for (const username of usernames) {
            const participant = participants.find(p => p.id.split('@')[0] === username);
            if (participant) {
                mentions.push(participant.id);
            } else {
                console.warn(`Pengguna dengan username @${username} tidak ditemukan di grup ${groupId}`);
            }
        }

        return mentions;
    } catch (error) {
        console.error("Gagal mengambil daftar participant:", error);
        return [];
    }
}