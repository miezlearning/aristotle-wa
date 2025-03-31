const { createCanvas } = require('canvas');

module.exports = {
    name: 'thr',
    alias: ['mintaTHR', 'lebaranTHR'],
    category: 'fun',
    description: 'Minta THR virtual ke nomor e-wallet pilihan untuk seru-seruan Lebaran',
    usage: '!thr <platform> <nomor>',
    permission: 'everyone',
    async execute(sock, msg, args) {
        try {
            // Cek apakah platform dan nomor diberikan
            if (args.length < 2) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Penggunaan: !thr <platform> <nomor>\nContoh: !thr dana 08123456789\nPlatform: dana, ovo, gopay, qris' 
                });
                return;
            }

            const platform = args[0].toLowerCase();
            const nomor = args[1];

            // Validasi platform yang didukung
            const supportedPlatforms = ['dana', 'ovo', 'gopay', 'qris'];
            if (!supportedPlatforms.includes(platform)) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Platform tidak didukung! Pilih: dana, ovo, gopay, qris' 
                });
                return;
            }

            // Validasi nomor (10-13 digit untuk e-wallet)
            if (!/^\d{10,13}$/.test(nomor)) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Nomor harus berupa angka 10-13 digit!' 
                });
                return;
            }

            // Generate nominal THR acak (antara Rp10.000 - Rp1.000.000)
            const nominalThr = Math.floor(Math.random() * 990000) + 10000;

            // Buat link berdasarkan platform
            let paymentLink;
            switch (platform) {
                case 'dana':
                    paymentLink = `https://link.dana.id/minta/${nomor}`;
                    break;
                case 'ovo':
                    paymentLink = `https://ovo.id/app/transfer?phone=${nomor}`; // Simulasi, OVO belum punya link resmi publik
                    break;
                case 'gopay':
                    paymentLink = `https://gopay.co/id/send-money/${nomor}`; // Simulasi
                    break;
                case 'qris':
                    paymentLink = `https://qris.id/pay?number=${nomor}`; // Simulasi QRIS generik
                    break;
            }

            // Buat kartu THR virtual dengan canvas
            const width = 450;
            const height = 400;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Latar belakang hijau Lebaran
            ctx.fillStyle = '#2E8B57'; // SeaGreen
            ctx.fillRect(0, 0, width, height);

            // Header
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('THR Lebaran 2025', width / 2, 60);

            // Platform dan Nomor
            ctx.font = '20px Arial';
            ctx.fillText(`Via: ${platform.toUpperCase()}`, width / 2, 120);
            ctx.fillText(`Nomor: ${nomor}`, width / 2, 160);

            // Nominal THR
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.font = 'bold 28px Arial';
            ctx.fillText(`Rp ${nominalThr.toLocaleString('id-ID')}`, width / 2, 220);

            // Link Pembayaran
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '16px Arial';
            const shortLink = paymentLink.length > 35 ? paymentLink.slice(0, 35) + '...' : paymentLink;
            ctx.fillText(`Link: ${shortLink}`, width / 2, 280);

            // Footer
            ctx.font = '14px Arial';
            ctx.fillText('Selamat Hari Raya Idul Fitri!', width / 2, 350);

            // Konversi ke buffer
            const buffer = canvas.toBuffer('image/png');

            // Pesan teks untuk dikirim
            let caption = `*Minta THR Lebaran!*\n`;
            caption += `Platform: ${platform.toUpperCase()}\n`;
            caption += `Nomor: ${nomor}\n`;
            caption += `THR: Rp ${nominalThr.toLocaleString('id-ID')}\n`;
            caption += `Kirim ke sini: ${paymentLink}\n\n`;
            caption += `Minal Aidin Wal Faizin, mohon THR-nya ya!`;

            // Kirim kartu THR ke pengguna
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption: caption
            });

            console.log(`THR diminta via ${platform} ke ${nomor}: Rp ${nominalThr}`);

        } catch (error) {
            console.error('Error di thr:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: 'Gagal bikin THR virtual. Sabar ya, botnya lagi kehabisan amplop!' 
            });
        }
    }
};