const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const puppeteer = require('puppeteer');

module.exports = {
    name: 'brat',
    category: 'general',
    description: 'Membuat sticker dengan gaya brat album dari teks',
    usage: '!brat <teks>',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            if (!args.length) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim teks dengan perintah !brat <teks>'
                });
            }

            const text = args.join(' ');    

            // Launch headless browser  
            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            // Create HTML content with only the "content" div
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My brat generator</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            box-sizing: border-box;
        }

        body {
	background-color: #f5f5f5;
	font-family: Arial, Helvetica, sans-serif;
}



        .content {
            width: 512px;
            height: 512px;
            margin: auto auto;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: justify; /* Justify teks */
            text-align-last: justify; /* Justify baris terakhir */
            filter: blur(2px);
            border: 1px solid #ccc; /* Border untuk visualisasi */
        }
    </style>
</head>
<body>
    <div class="content">
        <div class="text">${text}</div>
    </div>
</body>
<script>
function adjustFontSize() {
    const textElement = document.querySelector('.text'); // Pilih elemen teks
    const container = document.querySelector('.content'); // Pilih container
    const originalFontSize = 180; // Ukuran font awal
    const minFontSize = 12; // Batas minimum ukuran font

    // Reset ukuran font berdasarkan panjang teks
    textElement.style.fontSize = originalFontSize + 'px';

    // Dimensi maksimum container
    const maxHeight = container.clientHeight;
    const maxWidth = container.clientWidth;

    let fontSize = originalFontSize;

    // Sesuaikan ukuran font hingga sesuai dengan container
    while (
        (textElement.scrollHeight > maxHeight || textElement.scrollWidth > maxWidth) &&
        fontSize > minFontSize
    ) {
        fontSize--;
        textElement.style.fontSize = fontSize + 'px';
    }
}

// Panggil fungsi saat pertama kali dimuat
adjustFontSize();

// Untuk update dinamis, panggil adjustFontSize() setiap kali teks berubah
</script>
</html>
            `;

            await page.setContent(htmlContent);
            await page.setViewport({ width: 512, height: 512 });

            // Take a screenshot as a buffer
            const buffer = await page.screenshot({ type: 'png' });

            await browser.close();

            // Create sticker from image
            const sticker = new Sticker(Buffer.from(buffer), {
                pack: process.env.STICKER_PACKNAME || 'Aristotle Sticker',
                author: process.env.STICKER_AUTHOR || '@miezlipp',
                type: StickerTypes.FULL,
                quality: 50
            });

            const stickerMsg = await sticker.toMessage();
            await sock.sendMessage(msg.key.remoteJid, stickerMsg);

            // React with success emoji
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (error) {
            console.error('Error creating brat sticker:', error);

            // React with error emoji
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: "⚠️",
                    key: msg.key
                }
            });

            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal membuat sticker. Pastikan teks valid.'
            });
        }
    }
};