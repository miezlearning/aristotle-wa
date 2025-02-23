const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, } = require("@google/generative-ai");

// **Important:** Ensure you have set the GEMINI_API_KEY environment variable
const apiKey = process.env.API_GEMINI;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Or choose your desired model

const generationConfig = {
    temperature: 0.9, // Adjusted temperature for more balanced responses
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

const safetySettings = [  // Optional safety settings - adjust as needed
    {
        category: HarmCategory.HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];


module.exports = {
    name: 'chat',
    alias: ['c'],
    category: 'general',
    description: 'Chat with Gemini AI',
    usage: '!chat <your message>',
    permission: 'user',
    async execute(sock, msg, args) {
        if (args.length < 1) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a message to chat with Gemini. Example: `!chat Hello Gemini, how are you?`' });
        }

        const userMessage = args.join(' ');

        await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

        try {
            const chatSession = model.startChat({
                generationConfig,
                safetySettings, // Optional: Include safety settings
                history: [], // You can add conversation history here if needed for context
            });

            const geminiResult = await chatSession.sendMessage(userMessage);
            const responseText = geminiResult.response.text();
            console.log('Gemini API Response:', responseText);


            await sock.sendMessage(msg.key.remoteJid, { text: responseText });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to chat with Gemini. Error: ' + error.message });
        }
    },
};