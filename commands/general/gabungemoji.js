export default {
    name: 'gabungemoji',
    category: 'general',
    alias: ['ge', 'gmoji'],
    description: 'Membuat sebuah emoji dari gabungan emoji yang diberikan.',
    async execute(client, msg, args) {

        const endpointemoji = "https://emojik.vercel.app/s/"; // Endpoint emoji

        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya bisa digunakan di grup.' });
        }

        if (args.length === 0) {
            try {
                await client.sendMessage(msg.key.remoteJid, { text: '❌ Tolong isi emoji yang kamu gunakan' }, { quoted: msg });
                console.log('Error nih, isi emoji yang kamu gunakan');
            } catch (error) {
                console.error('Gagal:', error);
            }
            return;
        }

        const emoji1 = args[0];
        const emoji2 = args[1];

        if (!emoji1 || !emoji2) {
            return await client.sendMessage(msg.key.remoteJid, { text: '❌ Masukkan dua emoji!' });
        }

        try {

            const emojiURL = `${endpointemoji}${emoji1}_${emoji2}?size=128`;
            console.log(emojiURL);
            await client.sendMessage(msg.key.remoteJid, { image: { url: emojiURL } }, { quoted: msg });
        } catch (error) {
            console.error('Gagal membuat emoji:', error);
            await client.sendMessage(msg.key.remoteJid, { text: '❌ Gagal membuat emoji. Coba lagi nanti.' });
        }
    },
};