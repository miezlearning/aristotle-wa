const config = require('../../config.json');
const listManager = require('../../utils/listManager').listManager;

module.exports = {
    name: 'hapuslist',
    alias: ['removelist', 'keluarkanlist'],
    category: 'group',
    description: 'Menghapus peserta dari daftar berdasarkan indeks atau nama',
    usage: '!hapuslist <indeks_atau_nama>',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(groupId, { text: '❌ Command ini hanya bisa digunakan di grup!' });
        }

        listManager.checkExpiredLists();
        const list = listManager.getList(groupId);
        if (!list) {
            return await sock.sendMessage(groupId, {
                text: '❌ Belum ada list di grup ini atau list sudah kadaluarsa! Buat baru dengan !setup_list'
            });
        }

        try {
            // Pastikan ada input
            if (args.length < 1) {
                return await sock.sendMessage(groupId, {
                    text: '⚠️ Format salah! Gunakan: *!hapuslist <indeks_atau_nama>*\n' +
                          'Contoh: !hapuslist 1 atau !hapuslist Alip\n' +
                          'Lihat daftar dengan !lihat_list untuk indeks'
                });
            }

            const input = args.join(' ').trim();
            let removedParticipant = null;

            // Cek apakah input adalah angka (indeks)
            if (/^\d+$/.test(input)) {
                const index = parseInt(input) - 1; // Konversi ke indeks berbasis 0
                if (index < 0 || index >= list.participants.length) {
                    return await sock.sendMessage(groupId, {
                        text: `⚠️ Indeks *${input}* tidak valid! Harus antara 1 dan ${list.participants.length}.`
                    });
                }
                removedParticipant = listManager.removeParticipantByIndex(groupId, index);
            } 
            // Jika bukan angka, anggap sebagai nama
            else {
                removedParticipant = listManager.removeParticipantByName(groupId, input);
                if (!removedParticipant) {
                    return await sock.sendMessage(groupId, {
                        text: `⚠️ Nama *${input}* tidak ditemukan di list *${list.name}*!`
                    });
                }
            }

            console.log(`[${groupId}] ${removedParticipant.name} dihapus dari list ${list.name}`);
            const updatedList = listManager.getList(groupId);
            const participantList = updatedList.participants.length > 0
                ? updatedList.participants
                    .map((p, i) => `${i + 1}. ${p.name}${p.note ? ' - ' + p.note : ''}`)
                    .join('\n')
                : 'Daftar kosong';

            await sock.sendMessage(groupId, {
                text: `✅ *${removedParticipant.name}* berhasil dihapus dari list *${updatedList.name}*!\n\nDaftar saat ini:\n${participantList}`
            });

        } catch (error) {
            console.error('Error in hapuslist command:', error);
            await sock.sendMessage(groupId, { text: '❌ Gagal menghapus dari list: ' + error.message });
        }
    }
};