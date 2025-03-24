const config = require('../../config.json');
const listManager = require('../../utils/listManager');

module.exports = {
    name: 'setup_list',
    alias: ['setuplist', 'buat_list'],
    category: 'group',
    description: 'Membuat daftar untuk grup tertentu dan mengelola peserta',
    usage: '!setup_list',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(groupId, { text: '❌ Command ini hanya bisa digunakan di grup!' });
        }

        try {
            listManager.checkExpiredLists();
            if (listManager.getList(groupId)) {
                return await sock.sendMessage(groupId, {
                    text: '❌ Sudah ada list aktif di grup ini! Tutup list sebelumnya dengan !tutup_list atau gunakan !ikut untuk bergabung.'
                });
            }

            await sock.sendMessage(groupId, { text: '📋 Apa nama listnya?' });

            const filter = (response) => response.key.participant === msg.key.participant && response.key.remoteJid === groupId;
            const collected = await new Promise((resolve) => {
                sock.ev.on('messages.upsert', async ({ messages }) => {
                    const response = messages[0];
                    if (filter(response)) {
                        resolve(response);
                    }
                });
            });

            const listName = (collected.message.conversation || collected.message.extendedTextMessage?.text || '').trim();
            if (!listName || listName.length > 50) {
                return await sock.sendMessage(groupId, {
                    text: '❌ Nama list tidak boleh kosong atau lebih dari 50 karakter!'
                });
            }

            const created = listManager.createList(groupId, listName, msg.key.participant);
            if (!created) {
                return await sock.sendMessage(groupId, { text: '❌ Gagal membuat list!' });
            }

            console.log(`[${groupId}] List ${listName} dibuat oleh ${msg.key.participant}`);
            await sock.sendMessage(groupId, {
                text: `✅ Nama List: *${listName}*\nJika ingin masuk list, silakan ketik: *!ikut <nama> - <catatan>*\nContoh: !ikut Alip - Ayam Goreng`
            });

        } catch (error) {
            console.error('Error in setup_list:', error);
            await sock.sendMessage(groupId, { text: '❌ Gagal membuat list: ' + error.message });
        }
    }
};