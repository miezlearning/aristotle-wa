const fetch = require('node-fetch'); // Pastikan sudah diinstall: npm install node-fetch@2

// TypeScript Interfaces (opsional, hapus jika tidak pakai TS)
/**
 * @typedef {Object} Contribution
 * @property {string} date
 * @property {number} count
 * @property {0 | 1 | 2 | 3 | 4} level
 */

/**
 * @typedef {Object} Response
 * @property {{ [year: number]: number; [year: string]: number }} total
 * @property {Contribution[]} contributions
 */

module.exports = {
    name: 'githubcommit',
    category: 'utility',
    description: 'Mendapatkan informasi commit terakhir dan kontribusi GitHub berdasarkan username.',
    usage: '!githubcommit <username> [repository]',
    permission: 'member',
    /**
     * @param {any} sock - WhatsApp socket
     * @param {any} msg - Message object
     * @param {string[]} args - Command arguments
     */
    async execute(sock, msg, args) {
        console.log('Memulai perintah githubcommit...');

        if (args.length === 0) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Masukkan username GitHub!' }, { quoted: msg });
                console.log('Pesan kesalahan: Username kosong.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (username kosong):', error);
            }
            return;
        }

        const username = args[0];
        const repository = args[1]; // Optional: repositori spesifik
        
        try {
            // 1. Dapatkan info dasar pengguna
            const userResponse = await fetch(`https://api.github.com/users/${username}`, {
                headers: { 'User-Agent': 'WhatsApp-Bot' }
            });

            if (!userResponse.ok) {
                let errorMessage = `❌ Gagal mendapatkan informasi GitHub untuk ${username}.`;
                if (userResponse.status === 404) {
                    errorMessage = `❌ Pengguna GitHub dengan username *"${username}"* tidak ditemukan.`;
                } else if (userResponse.status === 403) {
                    errorMessage = '❌ Batas permintaan API GitHub tercapai. Coba lagi nanti.';
                }
                await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
                return;
            }

            const userData = await userResponse.json();
            
            // 2. Dapatkan informasi commit
            let commitsInfo = '';
            
            if (repository) {
                const commitsResponse = await fetch(`https://api.github.com/repos/${username}/${repository}/commits?per_page=5`, {
                    headers: { 'User-Agent': 'WhatsApp-Bot' }
                });
                
                if (!commitsResponse.ok) {
                    if (commitsResponse.status === 404) {
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: `❌ Repositori *"${repository}"* tidak ditemukan untuk pengguna *"${username}"*.` 
                        }, { quoted: msg });
                        return;
                    }
                    throw new Error(`GitHub API Error: ${commitsResponse.status}`);
                }
                
                const commitsData = await commitsResponse.json();
                
                if (commitsData.length > 0) {
                    commitsInfo = `\n📝 *Commit Terakhir pada ${repository}*\n`;
                    for (let i = 0; i < Math.min(commitsData.length, 5); i++) {
                        const commit = commitsData[i];
                        const date = new Date(commit.commit.author.date).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        commitsInfo += `\n${i+1}. *${date}*`;
                        commitsInfo += `\n   "${commit.commit.message.split('\n')[0]}"`;
                        commitsInfo += `\n   _Oleh: ${commit.commit.author.name}_`;
                        commitsInfo += `\n   [${commit.sha.substring(0, 7)}]`;
                        if (i < Math.min(commitsData.length, 5) - 1) commitsInfo += `\n`;
                    }
                } else {
                    commitsInfo = `\n📝 *Tidak ada commit pada repositori ${repository}*`;
                }
            } else {
                const eventsResponse = await fetch(`https://api.github.com/users/${username}/events?per_page=5`, {
                    headers: { 'User-Agent': 'WhatsApp-Bot' }
                });
                
                if (!eventsResponse.ok) {
                    throw new Error(`GitHub API Error: ${eventsResponse.status}`);
                }
                
                const eventsData = await eventsResponse.json();
                const commitEvents = eventsData.filter(event => 
                    event.type === 'PushEvent' || event.type === 'CommitCommentEvent' || event.type === 'CreateEvent'
                );
                
                if (commitEvents.length > 0) {
                    commitsInfo = `\n📝 *Aktivitas Commit Terakhir*\n`;
                    for (let i = 0; i < Math.min(commitEvents.length, 5); i++) {
                        const event = commitEvents[i];
                        const date = new Date(event.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        if (event.type === 'PushEvent' && event.payload.commits) {
                            const repo = event.repo.name.split('/')[1];
                            commitsInfo += `\n${i+1}. *${date}* - ${repo}`;
                            commitsInfo += `\n   Push: ${event.payload.commits.length} commit`;
                            if (event.payload.commits[0]) {
                                commitsInfo += `\n   "${event.payload.commits[0].message.split('\n')[0]}"`;
                            }
                        } else if (event.type === 'CreateEvent') {
                            const repo = event.repo.name.split('/')[1];
                            commitsInfo += `\n${i+1}. *${date}* - ${repo}`;
                            commitsInfo += `\n   Dibuat: ${event.payload.ref_type} ${event.payload.ref || ''}`;
                        }
                        if (i < Math.min(commitEvents.length, 5) - 1) commitsInfo += `\n`;
                    }
                } else {
                    commitsInfo = `\n📝 *Tidak ada aktivitas commit terbaru*`;
                }
            }
            
            // 3. Dapatkan statistik kontribusi
            let contribInfo = '';
            try {
                const contribResponse = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
                if (contribResponse.ok) {
                    /** @type {Response} */
                    const contribData = await contribResponse.json();
                    console.log('Data kontribusi:', contribData);

                    contribInfo = `\n🔥 *Statistik Kontribusi Tahun Ini (2025)*\n`;

                    // Total kontribusi tahun ini
                    const totalContributions = contribData.total && contribData.total["2025"] ? contribData.total["2025"] : 0;
                    contribInfo += `├ Total: ${totalContributions} kontribusi\n`;

                    // Kontribusi terbanyak dalam sehari
                    const contributionsArray = contribData.contributions || [];
                    const maxContribution = contributionsArray.reduce((max, day) => Math.max(max, day.count), 0);
                    if (maxContribution > 0) {
                        contribInfo += `├ Kontribusi terbanyak: ${maxContribution} dalam sehari\n`;
                    }

                    // Menghitung streak saat ini dan terpanjang
                    let currentStreak = 0;
                    let longestStreak = 0;
                    let tempStreak = 0;
                    let lastActiveDate = null;

                    const today = new Date("2025-03-03"); // Tanggal saat ini
                    const todayString = today.toISOString().split("T")[0]; // "2025-03-03"

                    for (const day of contributionsArray) {
                        if (day.count > 0) {
                            tempStreak++;
                            lastActiveDate = day.date;
                        } else {
                            tempStreak = 0;
                        }
                        longestStreak = Math.max(longestStreak, tempStreak);

                        if (day.date === todayString && day.count > 0) {
                            currentStreak = tempStreak;
                        } else if (day.date > todayString) {
                            break;
                        }
                    }

                    if (currentStreak > 0) {
                        contribInfo += `├ Streak saat ini: ${currentStreak} hari\n`;
                    }
                    if (longestStreak > 0) {
                        contribInfo += `├ Streak terpanjang: ${longestStreak} hari\n`;
                    }

                    if (lastActiveDate) {
                        const lastDate = new Date(lastActiveDate);
                        contribInfo += `└ Aktivitas terakhir: ${lastDate.toLocaleDateString('id-ID')}\n`;
                    } else {
                        contribInfo += `└ Aktivitas terakhir: Tidak ada\n`;
                    }
                } else {
                    contribInfo = `\n🔥 *Statistik Kontribusi Tahun Ini*\n└ Gagal memuat data\n`;
                }
            } catch (contribErr) {
                console.error('Gagal mendapatkan data kontribusi:', contribErr);
                contribInfo = `\n🔥 *Statistik Kontribusi Tahun Ini*\n└ Gagal memuat data\n`;
            }
            
            // 4. Gabungkan semua informasi
            let result = `┏━━━━━━━━━━━━━━━━━━━━━┓\n`;
            result += `┃  🔍 *GitHub Activity Info*  ┃\n`;
            result += `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
            
            result += `👤 *${userData.login}*${userData.name ? ` (${userData.name})` : ''}\n`;
            result += `📦 Repositori: ${userData.public_repos}\n`;
            result += `📅 Bergabung: ${new Date(userData.created_at).toLocaleDateString('id-ID')}\n`;
            result += contribInfo;
            result += commitsInfo;
            result += `\n\n🔗 *Profil GitHub:* ${userData.html_url}`;
            if (repository) result += `\n🔗 *Repositori:* ${userData.html_url}/${repository}`;
            
            // 5. Kirim pesan dengan avatar
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: userData.avatar_url },
                    caption: result
                }, { quoted: msg });
                console.log("Pesan GitHub commit berhasil terkirim");
            } catch (sendErr) {
                console.error("Gagal kirim gambar, mencoba kirim teks...", sendErr);
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: result }, { quoted: msg });
                    console.log("Pesan GitHub commit (text only) berhasil terkirim");
                } catch (err2) {
                    console.error("Gagal kirim pesan GitHub commit (text only):", err2);
                }
            }
            
        } catch (error) {
            console.error('Gagal mendapatkan informasi GitHub commit:', error);
            const errorMessage = '❌ Terjadi kesalahan saat menghubungi API GitHub.';
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
            } catch (err) {
                console.error("Gagal kirim pesan error:", err);
            }
        }
    }
};