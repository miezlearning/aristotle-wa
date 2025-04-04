const { createCanvas, loadImage } = require('canvas');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const jsQR = require('jsqr');
const QRCode = require('qrcode');

module.exports = {
    name: 'qris_generator',
    alias: ['qris', 'buatqris','qrisan'],
    category: 'utility',
    description: 'Generate dynamic QRIS dari static QRIS image',
    usage: '!qris_generator <nominal> <fee_option> [fee_amount]',
    permission: 'everyone',
    async execute(sock, msg, args) {
        try {
            console.log('Memulai eksekusi qris_generator...');
            if (!msg.message || !msg.message.imageMessage) {
                console.log('Pesan tidak berisi gambar.');
                await sock.sendMessage(msg.key.remoteJid, { text: 'Harap kirim gambar QRIS statis dengan perintah ini.' });
                return;
            }
            console.log('Pesan berisi gambar, melanjutkan...');

            if (args.length < 2) {
                console.log('Argumen kurang dari 2.');
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Penggunaan: !qris_generator <nominal> <fee_option> [fee_amount]\nContoh: !qris_generator 10000 ga' 
                });
                return;
            }
            console.log('Argumen valid, args:', args);

            // Ambil parameter dari args
            const nominal = args[0];
            const feeOption = args[1].toLowerCase();
            let feeAmount;
            if (feeOption !== 'ga') {
                if (args.length < 3) {
                    console.log('Fee option bukan "ga" tapi fee_amount tidak ada.');
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `Harap masukkan fee_amount untuk opsi ${feeOption}. Contoh: !qris_generator 10000 ${feeOption} 5` 
                    });
                    return;
                }
                feeAmount = args[2];
            }

            // Validasi input
            if (isNaN(Number(nominal))) {
                console.log('Nominal bukan angka:', nominal);
                await sock.sendMessage(msg.key.remoteJid, { text: 'Nominal harus berupa angka.' });
                return;
            }
            if (!['ga', 'percent', 'rupiah'].includes(feeOption)) {
                console.log('Fee option tidak valid:', feeOption);
                await sock.sendMessage(msg.key.remoteJid, { text: 'Fee option harus "ga", "percent", atau "rupiah".' });
                return;
            }
            if (feeOption !== 'ga' && isNaN(Number(feeAmount))) {
                console.log('Fee amount bukan angka:', feeAmount);
                await sock.sendMessage(msg.key.remoteJid, { text: 'Fee amount harus berupa angka.' });
                return;
            }
            console.log('Input valid: nominal=', nominal, 'feeOption=', feeOption, 'feeAmount=', feeAmount);

            // Unduh gambar QRIS statis
            console.log('Mengunduh gambar QRIS...');
            const buffer = await downloadMediaMessage(
                {
                    message: {
                        imageMessage: msg.message.imageMessage
                    },
                    key: msg.key
                },
                'buffer',
                {},
                { logger: console }
            );
            console.log('Gambar berhasil diunduh, ukuran buffer:', buffer.length);

            // Muat gambar ke canvas
            const img = await loadImage(buffer);
            console.log('Gambar dimuat ke canvas, ukuran:', img.width, 'x', img.height);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Ekstrak data QRIS
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCodeData = jsQR(imageData.data, imageData.width, imageData.height);
            if (!qrCodeData) {
                console.log('Gagal membaca QR code dari gambar.');
                await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal membaca data QRIS dari gambar.' });
                return;
            }
            console.log('QR code terbaca, data:', qrCodeData.data);
            const qrisData = qrCodeData.data;

            // Konversi ke QRIS dinamis
            const dynamicQRIS = convertQRIS(qrisData, nominal, feeOption, feeAmount);
            console.log('QRIS dinamis dibuat:', dynamicQRIS);

            // Buat gambar QRIS dinamis
            const qrBuffer = await QRCode.toBuffer(dynamicQRIS);
            console.log('Gambar QRIS dinamis dibuat, ukuran buffer:', qrBuffer.length);

            // Hitung total
            let total = Number(nominal);
            let feeText = '';
            if (feeOption === 'percent') {
                const fee = total * (Number(feeAmount) / 100);
                total += fee;
                feeText = `${feeAmount}% (Rp ${Math.round(fee).toLocaleString('id-ID')})`;
            } else if (feeOption === 'rupiah') {
                total += Number(feeAmount);
                feeText = `Rp ${Number(feeAmount).toLocaleString('id-ID')}`;
            }
            console.log('Total dihitung:', total);

            // Buat caption
            let caption = `*QRIS Dinamis untuk Pembayaran*\n\n`;
            caption += `Nominal: Rp ${Number(nominal).toLocaleString('id-ID')}\n`;
            if (feeOption !== 'ga') {
                caption += `Fee: ${feeText}\n`;
            }
            caption += `Total: Rp ${total.toLocaleString('id-ID')}`;
            console.log('Caption dibuat:', caption);

            // Kirim gambar QRIS dinamis dengan caption
            console.log('Mengirim pesan ke', msg.key.remoteJid);
            const sentMessage = await sock.sendMessage(msg.key.remoteJid, {
                image: qrBuffer,
                caption: caption
            });
            console.log('Pesan terkirim, ID:', sentMessage?.key?.id);

        } catch (error) {
            console.error('Error di qris_generator:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Terjadi kesalahan saat membuat QRIS dinamis.' });
        }
    }
};

// Fungsi untuk mengonversi QRIS statis ke dinamis
function convertQRIS(qris, nominal, feeOption, feeAmount) {
    let tax = '';
    if (feeOption === 'rupiah') {
        tax = '55020256' + String(feeAmount.length).padStart(2, '0') + feeAmount;
    } else if (feeOption === 'percent') {
        tax = '55020357' + String(feeAmount.length).padStart(2, '0') + feeAmount;
    }

    qris = qris.substring(0, qris.length - 4);
    const step1 = qris.replace('010211', '010212');
    const step2 = step1.split('5802ID');
    let uang = '54' + String(nominal.length).padStart(2, '0') + nominal;

    if (!tax) {
        uang += '5802ID';
    } else {
        uang += tax + '5802ID';
    }

    const fix = step2[0] + uang + step2[1];
    const crc = ConvertCRC16(fix);
    return fix + crc;
}

// Fungsi untuk menghitung CRC16
function ConvertCRC16(str) {
    function charCodeAt(str, i) {
        return str.charCodeAt(i);
    }
    let crc = 0xffff;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
        crc ^= charCodeAt(str, c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    let hex = (crc & 0xffff).toString(16).toUpperCase();
    if (hex.length === 3) hex = '0' + hex;
    return hex;
}