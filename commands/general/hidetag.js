const config = require('../../config.json');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'hidetag',
    category: 'general',
    description: 'Mention semua orang di dalam grup (hanya admin).',
    usage: '!hidetag <pesan> (opsional: tambahkan media atau reply pesan)',
    permission: 'admin',
    async execute(sock, msg, args) {
        console.log('Memulai perintah hidetag...');

        // Cek apakah pengirim adalah admin
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const isAdmin = groupMetadata.participants.find(participant => participant.id === msg.key.participant && participant.admin !== null);
        if (!isAdmin) {
            console.log('Bukan admin yang diizinkan.');
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Kamu tidak punya izin kawan' });
                console.log('Pesan kesalahan izin berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan izin:', error);
            }
            return;
        }

        const participants = groupMetadata.participants;
        const mentions = participants.map(x => x.id);
        let text = args.join(" ") || "Hai semuanya!"; // Pesan default kalau nggak ada teks

        try {
            // Cek media di pesan utama (langsung kirim)
            const mainMsg = msg.message;
            if (mainMsg.imageMessage) {
                // Handle gambar langsung
                const stream = await downloadContentFromMessage(mainMsg.imageMessage, 'image');
                const buffer = Buffer.concat(await stream.toArray());
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        image: buffer,
                        caption: text,
                        mentions: mentions
                    },
                    { quoted: msg }
                );
                console.log('Hidetag dengan gambar langsung berhasil dikirim.');
            } else if (mainMsg.videoMessage) {
                // Handle video langsung
                const stream = await downloadContentFromMessage(mainMsg.videoMessage, 'video');
                const buffer = Buffer.concat(await stream.toArray());
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        video: buffer,
                        caption: text,
                        mentions: mentions
                    },
                    { quoted: msg }
                );
                console.log('Hidetag dengan video langsung berhasil dikirim.');
            } else {
                // Cek pesan yang dikutip (quoted)
                const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg) {
                    // Ambil teks dari quoted message jika ada
                    if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
                        text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { text: text, mentions: mentions },
                            { quoted: msg }
                        );
                        console.log('Hidetag dengan teks dari quoted berhasil dikirim.');
                    } else if (quotedMsg.imageMessage) {
                        // Handle gambar dari quoted
                        const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                        const buffer = Buffer.concat(await stream.toArray());
                        await sock.sendMessage(
                            msg.key.remoteJid,
                            {
                                image: buffer,
                                caption: text,
                                mentions: mentions
                            },
                            { quoted: msg }
                        );
                        console.log('Hidetag dengan gambar dari quoted berhasil dikirim.');
                    } else if (quotedMsg.videoMessage) {
                        // Handle video dari quoted
                        const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
                        const buffer = Buffer.concat(await stream.toArray());
                        await sock.sendMessage(
                            msg.key.remoteJid,
                            {
                                video: buffer,
                                caption: text,
                                mentions: mentions
                            },
                            { quoted: msg }
                        );
                        console.log('Hidetag dengan video dari quoted berhasil dikirim.');
                    } else {
                        // Kirim teks biasa kalau quoted bukan media atau teks
                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { text: text, mentions: mentions },
                            { quoted: msg }
                        );
                        console.log('Hidetag teks biasa (quoted non-media) berhasil dikirim.');
                    }
                } else {
                    // Kirim teks biasa kalau nggak ada media atau quoted
                    await sock.sendMessage(
                        msg.key.remoteJid,
                        { text: text, mentions: mentions },
                        { quoted: msg }
                    );
                    console.log('Hidetag teks biasa berhasil dikirim.');
                }
            }
        } catch (error) {
            console.error('Gagal mengirim hidetag:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengirim hidetag. Coba lagi nanti.' });
                console.log('Pesan kesalahan hidetag berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan hidetag:', sendMessageError);
            }
        }
    }
};