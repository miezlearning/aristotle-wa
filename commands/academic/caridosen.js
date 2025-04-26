const config = require('../../config.json');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'caridosen',
    alias: ['dosendata', 'infodosen'],
    category: 'academic',
    description: 'Mengambil data dosen berdasarkan nama (khusus UNMUL) termasuk NIP dan foto',
    usage: '!caridosen <nama dosen>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah caridosen dipanggil:', JSON.stringify(msg, null, 2));

        // Cek apakah pesan berasal dari chat pribadi
        const isPrivateChat = !msg.key.remoteJid.includes('@g.us');
        if (!isPrivateChat) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Perintah ini hanya bisa digunakan di chat pribadi!'
            });
        }

        const orang_khusus = [
            '6281345028895@s.whatsapp.net',
            '6283153586529@s.whatsapp.net',
            '6282256877604@s.whatsapp.net',
            '6285787485168@s.whatsapp.net'
        ];

        // Cek apakah pengirim ada di daftar yang diizinkan
        const userId = msg.key.remoteJid;
        if (!orang_khusus.includes(userId)) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Maaf, YKKA yang khusus khusus aja!'
            });
        }

        try {
            // Validasi input nama dosen
            const keyword = args.join(' ').trim();
            if (!keyword) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan nama dosen yang valid!\n\n' +
                          '⚠️ *Format:* !caridosen <nama dosen>\n' +
                          '✅ Contoh: !caridosen Nataniel Dengen'
                });
            }

            console.log('Nama dosen yang dicari:', keyword);

            // Beri reaksi loading
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Langkah 1: Cari dosen menggunakan API PDDikti
            const searchUrl = `https://api-pddikti.vercel.app/search/dosen/${encodeURIComponent(keyword + ' unmul')}`;
            console.log('API URL Pencarian Dosen:', searchUrl);

            const searchResponse = await axios.get(searchUrl);
            const dosenData = searchResponse.data;

            // Cek apakah data ditemukan (respons API berupa array langsung)
            if (!Array.isArray(dosenData) || dosenData.length === 0) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ Dosen dengan nama "${keyword}" tidak ditemukan di UNMUL!`
                });
            }

            // Ambil data dosen pertama yang cocok
            const dosen = dosenData[0];
            const idDosen = dosen.id;
            const dosenInfo = {
                nama: dosen.nama || 'Tidak tersedia',
                nidn: dosen.nidn || 'Tidak tersedia',
                nuptk: dosen.nuptk || 'Tidak tersedia',
                nama_pt: dosen.nama_pt || 'Tidak tersedia',
                nama_prodi: dosen.nama_prodi || 'Tidak tersedia'
            };

            // Langkah 2: Ambil profil dosen dari API
            const profileUrl = `https://api-pddikti.vercel.app/dosen/profile/${idDosen}/`;
            console.log('API URL Profil Dosen:', profileUrl);

            let profileInfo = {};
            try {
                const profileResponse = await axios.get(profileUrl);
                const profileData = profileResponse.data;

                profileInfo = {
                    jenis_kelamin: profileData.jenis_kelamin || 'Tidak tersedia',
                    jabatan_akademik: profileData.jabatan_akademik || 'Tidak tersedia',
                    pendidikan_tertinggi: profileData.pendidikan_tertinggi || 'Tidak tersedia',
                    status_ikatan_kerja: profileData.status_ikatan_kerja || 'Tidak tersedia',
                    status_aktivitas: profileData.status_aktivitas || 'Tidak tersedia'
                };
            } catch (profileError) {
                console.warn('Gagal mengambil profil dosen:', profileError.message);
                profileInfo = {
                    jenis_kelamin: 'Tidak tersedia',
                    jabatan_akademik: 'Tidak tersedia',
                    pendidikan_tertinggi: 'Tidak tersedia',
                    status_ikatan_kerja: 'Tidak tersedia',
                    status_aktivitas: 'Tidak tersedia'
                };
            }

            // Langkah 3: Ambil riwayat pendidikan dosen dari API
            const studyUrl = `https://api-pddikti.vercel.app/dosen/study-history/${idDosen}/`;
            console.log('API URL Riwayat Pendidikan:', studyUrl);

            let studyText = '';
            try {
                const studyResponse = await axios.get(studyUrl);
                const studyData = studyResponse.data;

                if (Array.isArray(studyData) && studyData.length > 0) {
                    studyText = studyData.map((study, index) => {
                        return `📚 *Pendidikan ${index + 1}*\n` +
                               `Jenjang: ${study.jenjang || 'Tidak tersedia'}\n` +
                               `Program Studi: ${study.nama_prodi || 'Tidak tersedia'}\n` +
                               `Perguruan Tinggi: ${study.nama_pt || 'Tidak tersedia'}\n` +
                               `Gelar: ${study.gelar_akademik || 'Tidak tersedia'} (${study.singkatan_gelar || 'Tidak tersedia'})\n` +
                               `Tahun Masuk: ${study.tahun_masuk || 'Tidak tersedia'}\n` +
                               `Tahun Lulus: ${study.tahun_lulus || 'Tidak tersedia'}\n`;
                    }).join('\n');
                } else {
                    studyText = '⚠️ Riwayat pendidikan tidak ditemukan.';
                }
            } catch (studyError) {
                console.warn('Gagal mengambil riwayat pendidikan:', studyError.message);
                studyText = '⚠️ Riwayat pendidikan tidak ditemukan.';
            }

            // Langkah 4: Scraping NIP dan foto dari situs UNMUL Informatika
            const scrapeUrl = 'https://informatika.ft.unmul.ac.id/page?content=Dosen';
            console.log('Scraping URL:', scrapeUrl);

            const scrapeResponse = await axios.get(scrapeUrl);
            const $ = cheerio.load(scrapeResponse.data);

            // Ambil semua elemen <p> yang berisi data dosen
            const dosenList = [];
            let currentDosen = null;

            $('.post-content p').each((index, element) => {
                const $element = $(element);
                const text = $element.text().trim();
                const img = $element.find('img').attr('src');

                if (img) {
                    currentDosen = { photoUrl: img };
                } else if (text && currentDosen && !currentDosen.nama) {
                    currentDosen.nama = text;
                } else if (text && currentDosen && currentDosen.nama && !currentDosen.nip) {
                    currentDosen.nip = text.replace(/\s/g, '');
                    dosenList.push(currentDosen);
                    currentDosen = null;
                }
            });

            // Cari dosen yang cocok dengan keyword
            const dosenMatch = dosenList.find(dosen => 
                dosen.nama.toLowerCase().includes(keyword.toLowerCase())
            );

            let nip = 'Tidak tersedia';
            let buffer = null;
            if (dosenMatch) {
                nip = dosenMatch.nip;

                // Ambil foto dosen
                try {
                    const photoResponse = await axios.get(dosenMatch.photoUrl, { responseType: 'arraybuffer' });
                    buffer = Buffer.from(photoResponse.data, 'binary');
                } catch (photoError) {
                    console.warn('Gagal mengambil foto:', photoError.message);
                    buffer = null;
                }
            } else {
                console.warn('Dosen tidak ditemukan di situs UNMUL Informatika untuk NIP dan foto.');
            }

            // Langkah 5: Format hasil
            const resultText = `👨‍🏫 *Data Dosen UNMUL*\n\n` +
                              `👤 Nama: ${dosenInfo.nama}\n` +
                              `📍 NIP: ${nip}\n` +
                              `📍 NIDN: ${dosenInfo.nidn}\n` +
                              `📍 NUPTK: ${dosenInfo.nuptk}\n` +
                              `🏫 Program Studi: ${dosenInfo.nama_prodi}\n` +
                              `🎓 Perguruan Tinggi: ${dosenInfo.nama_pt}\n\n` +
                              `📋 *Profil Dosen*\n` +
                              `Jenis Kelamin: ${profileInfo.jenis_kelamin}\n` +
                              `Jabatan Akademik: ${profileInfo.jabatan_akademik}\n` +
                              `Pendidikan Tertinggi: ${profileInfo.pendidikan_tertinggi}\n` +
                              `Status Ikatan Kerja: ${profileInfo.status_ikatan_kerja}\n` +
                              `Status Aktivitas: ${profileInfo.status_aktivitas}\n\n` +
                              `🎓 *Riwayat Pendidikan*\n${studyText}`;

            // Kirim pesan dengan foto (jika ada)
            if (buffer) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: buffer,
                    caption: resultText
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: resultText + '\n⚠️ Foto tidak ditemukan.'
                });
            }

            // Beri reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing caridosen command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + error.message
            });
        }
    }
};