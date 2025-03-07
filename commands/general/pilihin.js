const config = require('../../config.json');

module.exports = {
    name: 'pilihin',
    alias: ['pilih', 'pick'],
    category: 'fun',
    description: 'Memilih secara acak dari beberapa opsi yang diberikan, pisahkan opsi dengan tanda |',
    usage: '!pilihin <opsi1> | <opsi2> | <opsi3> ...',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah pilihin dipanggil:', JSON.stringify(msg, null, 2));
        
        try {
            // Gabungkan argumen menjadi string lalu pisahkan dengan tanda |
            const input = args.join(' ').trim();
            const options = input.split('|').map(option => option.trim());

            // Cek apakah ada minimal 2 opsi
            if (options.length < 2 || options.some(opt => opt === '')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Berikan minimal 2 opsi untuk dipilih, pisahkan dengan tanda |!\n\n' +
                          '⚠️ *Format:* !pilihin <opsi1> | <opsi2> | ...\n' +
                          '✅ Contoh: !pilihin Makan di rumah | Pergi ke restoran | Pesan online'
                });
            }

            console.log('Opsi yang diberikan:', options);

            // Beri reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            // Pilih secara acak dari opsi
            const randomIndex = Math.floor(Math.random() * options.length);
            const chosenOption = options[randomIndex];
            console.log('Opsi terpilih:', chosenOption);

            // Kirim hasil pilihan
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎲 Dari opsi: ${options.join(', ')}\n` +
                      `✅ Saya pilih: *${chosenOption}*`
            });

            // Beri reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing pilihin command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + error.message
            });
        }
    }
};