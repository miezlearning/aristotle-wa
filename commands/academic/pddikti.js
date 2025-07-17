const config = require('../../config.json');
const axios = require('axios');

module.exports = {
    name: 'carimhs',
    alias: ['cekmhs', 'pddikti'],
    category: 'academic',
    description: 'Menampilkan data mahasiswa dari PDDikti berdasarkan keyword pencarian',
    usage: '!carimhs <keyword> [-b <jumlah>]',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah carimhs dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Pisahkan argumen untuk keyword dan batasan
            let keyword = args.join(' ').trim();
            let limit = null;

            // Cek apakah ada argumen -b untuk batasan
            const limitIndex = args.indexOf('-b');
            if (limitIndex !== -1 && limitIndex + 1 < args.length) {
                limit = parseInt(args[limitIndex + 1]);
                if (isNaN(limit) || limit < 1) {
                    return await sock.sendMessage(msg.key.remoteJid, {
                        text: 'Batasan jumlah data harus berupa angka positif!\n\n' +
                              '⚠️ *Format:* !carimhs <keyword> [-b <jumlah>]\n' +
                              '✅ Contoh: !carimhs muhammad alif mulawarman -b 3 (artinya menampilkan 3 saja)'
                    });
                }
                // Hapus -b dan jumlahnya dari keyword
                keyword = args.slice(0, limitIndex).join(' ').trim();
            }

            // Validasi keyword
            if (!keyword || keyword.length < 3) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan keyword pencarian yang valid!\n\n' +
                          '⚠️ *Format:* !carimhs <keyword> [-b <jumlah>]\n' +
                          '✅ Contoh: !carimhs muhammad alif mulawarman -b 3'
                });
            }

            console.log('Keyword yang dicari:', keyword);
            console.log('Batasan jumlah:', limit || 'Tidak ada (tampilkan semua)');

            // Beri reaksi loading
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // URL API PDDikti
            const url = "https:/api-pddikti.ridwaanhall.com/search/mhs";
            const apiUrl = `${url}/${encodeURIComponent(keyword)}/?format=json`;
            console.log('API URL:', apiUrl);

            // Ambil data dari API
            const response = await axios.get(apiUrl);
            const data = response.data;

            // Cek apakah data ditemukan
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('Data mahasiswa tidak ditemukan untuk keyword tersebut!');
            }

            // Terapkan batasan jika ada
            const mahasiswaList = limit ? data.slice(0, limit) : data;
            console.log('Jumlah data yang akan ditampilkan:', mahasiswaList.length);

            // Susun informasi mahasiswa
            let resultText = `🎓 *Data Mahasiswa PDDikti* (Ditemukan: ${data.length})\n\n`;
            mahasiswaList.forEach((mhs, index) => {
                const mhsData = {
                    nama: mhs.nama || 'Tidak tersedia',
                    nim: mhs.nim || 'Tidak tersedia',
                    perguruan: mhs.nama_pt || 'Tidak tersedia',
                    singkatan: mhs.sinkatan_pt || 'Tidak tersedia',
                    prodi: mhs.nama_prodi || 'Tidak tersedia'
                };
                resultText += `📌 *Mahasiswa ${index + 1}*\n` +
                              `👤 Nama: ${mhsData.nama}\n` +
                              `📍 NIM: ${mhsData.nim}\n` +
                              `🏫 Program Studi: ${mhsData.prodi}\n` +
                              `🎓 Perguruan Tinggi: ${mhsData.perguruan} (${mhsData.singkatan})\n\n`;
            });

            // Kirim informasi mahasiswa
            await sock.sendMessage(msg.key.remoteJid, { text: resultText });

            // Beri reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing carimhs command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + (error.response?.data?.message || error.message)
            });
        }
    }
};