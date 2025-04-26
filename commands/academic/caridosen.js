const config = require('../../config.json');
const axios = require('axios');
const cheerio = require('cheerio');

// Data nomor telepon dari spreadsheet (hard-coded berdasarkan data sebelumnya)
const phoneData = [
    { nama: "Dr. H. Fahrul Agus, S.Si., MT", telepon: "0812-5868-403" },
    { nama: "Dr.Ir. Nataniel Dengen, S.Si., M.Si", telepon: "0812-3455-3816" },
    { nama: "Ramadiani, S.Pd., M.Si., M.Kom., Ph.D", telepon: "0852-5050-1973" },
    { nama: "Prof. Haviluddin, S.Kom., M.Kom., Ph.D., IPM., ASEAN Eng", telepon: "0813-3111-2002" },
    { nama: "Prof. Dr. Hamdani, ST., M.Cs., IPM", telepon: "0815-5145-193" },
    { nama: "Prof. Dr. Anindita Septiarini, ST., M.Cs", telepon: "0815-5145-190" },
    { nama: "Awang Harsa Kridalaksana, S.Kom., M.Kom", telepon: "0821-1234-1229" },
    { nama: "Zainal Arifin, S.Kom., M.Kom", telepon: "0812-5877-790" },
    { nama: "Ir. Dedy Cahyadi, S.Kom., M.Eng", telepon: "0819-5014-112" },
    { nama: "Ir. Indah Fitri Astuti, S.Kom., M.Cs", telepon: "0852-5012-1280" },
    { nama: "Masna Wati, S.Si., MT", telepon: "0852-4216-8438" },
    { nama: "Ir. Novianti Puspitasari, S.Kom., M.Eng", telepon: "0813-4664-8418" },
    { nama: "Ummul Hairah, S.Pd., MT", telepon: "0852-5588-6778" },
    { nama: "Medi Taruk, S.Kom., M.Cs", telepon: "0815-4343-8301" },
    { nama: "Rosmasari, S.Kom., M.T", telepon: "0852-4629-9986" },
    { nama: "Muhammad Bambang Firdaus, S.Kom., M.Kom", telepon: "0823-5215-8682" },
    { nama: "Anton Prafanto, S.Kom., M.T", telepon: "0852-5069-0673" },
    { nama: "Andi Tejawati, S.Si., M.Si", telepon: "0852-4741-9498" },
    { nama: "Gubtha Mahendra Putra, S.Kom., M.Eng", telepon: "0811-5808-624" },
    { nama: "Reza Wardhana, S.Kom., M.Eng", telepon: "0811-8207-777" },
    { nama: "Rasni Alex, MM", telepon: "0811-559-449" },
    { nama: "Aulia Khoirunnita, M.Kom", telepon: "0853-8872-9017" },
    { nama: "Riftika Rizawanti, M.Cs", telepon: "0877-6247-0080" },
    { nama: "M. Ibadurrahman A.S., M.Kom", telepon: "0851-5539-9159" },
    { nama: "Rajiansyah, M. Sc", telepon: "+48 731 819 948" },
    { nama: "Dr. Ir. Didit Suprihanto., S.T., M.Kom", telepon: "0812-5130-2222" },
    { nama: "Dr. Akhmad Irsyad, S.T., M.Kom", telepon: "0812-8654-3021" }
];

module.exports = {
    name: 'caridosen',
    alias: ['dosendata', 'infodosen'],
    category: 'academic',
    description: 'Mengambil data dosen berdasarkan nama (khusus UNMUL) termasuk NIP, foto, nomor telepon, dan indeks SINTA',
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
            console.log('Scraping URL untuk NIP dan Foto:', scrapeUrl);

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

            // Langkah 5: Cari nomor telepon dari data spreadsheet
            let telepon = 'Tidak tersedia';
            const phoneMatch = phoneData.find(data => 
                data.nama.toLowerCase().includes(keyword.toLowerCase())
            );
            if (phoneMatch) {
                telepon = phoneMatch.telepon;
            } else {
                console.warn('Nomor telepon tidak ditemukan di spreadsheet.');
            }

            // Langkah 6: Scraping indeks SINTA saja
            let sintaUrl = 'Tidak tersedia';

            try {
                // Cari dosen di SINTA
                const sintaSearchUrl = `https://sinta.kemdikbud.go.id/authors?type=author&q=${encodeURIComponent(keyword)}`;
                console.log('Scraping SINTA Search URL:', sintaSearchUrl);

                const sintaResponse = await axios.get(sintaSearchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                const $sinta = cheerio.load(sintaResponse.data);

                // Cari card dosen yang sesuai (berafiliasi dengan Universitas Mulawarman)
                const profileCard = $sinta('.list-item').filter((i, el) => {
                    const name = $sinta(el).find('.profile-name a').text().trim().toLowerCase();
                    const affiliation = $sinta(el).find('.profile-affil a').text().trim().toLowerCase();
                    return name.includes(keyword.toLowerCase()) && affiliation.includes('universitas mulawarman');
                }).first();

                if (profileCard.length) {
                    // Ambil URL SINTA dari elemen profile-name
                    const sintaPath = profileCard.find('.profile-name a').attr('href');
                    if (sintaPath) {
                        // Pastikan URL tidak digabungkan secara berlebihan
                        sintaUrl = sintaPath.startsWith('http') ? sintaPath : `https://sinta.kemdikbud.go.id${sintaPath}`;
                        console.log('SINTA Profile URL:', sintaUrl);
                    }
                } else {
                    console.warn('Profil SINTA tidak ditemukan untuk dosen ini.');
                }
            } catch (sintaError) {
                console.warn('Gagal mengambil indeks dari SINTA:', sintaError.message);
            }

            // Langkah 7: Format hasil
            const resultText = `👨‍🏫 *Data Dosen UNMUL*\n\n` +
                              `👤 Nama: ${dosenInfo.nama}\n` +
                              `📍 NIP: ${nip}\n` +
                              `📍 NIDN: ${dosenInfo.nidn}\n` +
                              `📍 NUPTK: ${dosenInfo.nuptk}\n` +
                              `📞 Nomor Telepon: ${telepon}\n` +
                              `🏫 Program Studi: ${dosenInfo.nama_prodi}\n` +
                              `🎓 Perguruan Tinggi: ${dosenInfo.nama_pt}\n\n` +
                              `📋 *Profil Dosen*\n` +
                              `Jenis Kelamin: ${profileInfo.jenis_kelamin}\n` +
                              `Jabatan Akademik: ${profileInfo.jabatan_akademik}\n` +
                              `Pendidikan Tertinggi: ${profileInfo.pendidikan_tertinggi}\n` +
                              `Status Ikatan Kerja: ${profileInfo.status_ikatan_kerja}\n` +
                              `Status Aktivitas: ${profileInfo.status_aktivitas}\n\n` +
                              `🎓 *Riwayat Pendidikan*\n${studyText}\n\n` +
                              `📊 *Indeks*\n` +
                              `SINTA: ${sintaUrl}`;

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