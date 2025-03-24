const config = require('../../config.json');
const fs = require('fs');
const path = require('path');

const listsFile = path.join(__dirname, 'lists.json');

class ListManager {
    constructor() {
        this.lists = new Map();
        this.loadLists();
    }

    // Membuat list baru
    createList(groupId, listName, creator) {
        if (this.lists.has(groupId)) {
            return false; // List sudah ada
        }
        this.lists.set(groupId, {
            name: listName,
            participants: [],
            createdAt: Date.now(),
            creator: creator
        });
        this.saveLists();
        return true;
    }

    // Menambahkan peserta ke list
    addParticipant(groupId, participant, note = '') {
        if (this.lists.has(groupId)) {
            const list = this.lists.get(groupId);
            if (list.participants.length >= 50) {
                return { success: false, reason: 'full' }; // List penuh
            }
            if (list.participants.some(p => p.name.toLowerCase() === participant.toLowerCase())) {
                return { success: false, reason: 'duplicate' }; // Peserta sudah ada
            }
            list.participants.push({ name: participant, note });
            this.saveLists();
            return { success: true };
        }
        return { success: false, reason: 'not_found' };
    }

    // Menghapus list
    deleteList(groupId) {
        if (this.lists.has(groupId)) {
            this.lists.delete(groupId);
            this.saveLists();
            return true;
        }
        return false;
    }

    // Mendapatkan detail list
    getList(groupId) {
        this.checkExpiredLists();
        return this.lists.get(groupId) || null;
    }

    // Cek dan hapus list yang kadaluarsa (24 jam)
    checkExpiredLists() {
        const now = Date.now();
        for (const [groupId, list] of this.lists.entries()) {
            if (now - list.createdAt > 24 * 60 * 60 * 1000) { // 24 jam
                this.lists.delete(groupId);
                console.log(`List di ${groupId} kadaluarsa dan dihapus`);
            }
        }
        this.saveLists();
    }

    // Simpan list ke file JSON
    saveLists() {
        fs.writeFileSync(listsFile, JSON.stringify([...this.lists], null, 2));
    }

    // Muat list dari file JSON
    loadLists() {
        if (fs.existsSync(listsFile)) {
            const data = JSON.parse(fs.readFileSync(listsFile));
            this.lists = new Map(data);
        }
    }
}

const listManager = new ListManager();

// Command !setup_list
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