const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const apiKey = process.env.API_GEMINI;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const generationConfig = {
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

module.exports = {
    name: 'chat',
    alias: ['c'],
    category: 'general',
    description: 'Chat with Gemini AI',
    usage: '!chat <pesan>',
    permission: 'user',
    async execute(sock, msg, args) {
        if (args.length < 1) {
            return await sock.sendMessage(msg.key.remoteJid, { 
                text: 'Tolong sertakan pesannya, contoh \`!chat/!c Halo, teman.\`' 
            });
        }

        const userMessage = args.join(' ');

        await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

        try {
            const chatSession = model.startChat({
                generationConfig,
                safetySettings,
                history: [],
            });

            const geminiResult = await chatSession.sendMessage(userMessage);
            const responseText = geminiResult.response.text();
            console.log('Gemini API Response:', responseText);

            await sock.sendMessage(msg.key.remoteJid, { text: responseText });
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to chat with Gemini. Error: ' + error.message 
            });
        }
    },
};