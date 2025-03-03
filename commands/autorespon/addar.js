const { getAutoResponsesForGroup, saveAutoResponsesForGroup } = require('../../utils/autoResponseUtils');

module.exports = {
    name: 'addautoresponse',
    category: 'auto response',
    alias: ['addar', 'buatar'],
    description: 'Menambahkan auto respon ke grup (hanya teks).',
    async execute(client, msg, args) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'This command is only for groups.' });
        }

        const groupId = msg.key.remoteJid;
        const input = args.join(' '); 
        const parts = input.split('|'); 
        
        if (parts.length < 2) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Usage: !addautoresponse [trigger] | [response]' });
        }

        const trigger = parts[0].trim(); 
        const response = parts.slice(1).join('|').trim(); 

        if (!trigger || !response) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Usage: !addautoresponse [trigger] | [response]' });
        }

        try {
            let autoResponses = await getAutoResponsesForGroup(groupId);
            const existingTriggerIndex = autoResponses.findIndex(ar => ar.trigger.toLowerCase() === trigger.toLowerCase());
            if (existingTriggerIndex !== -1) {
                return await client.sendMessage(msg.key.remoteJid, { text: '❌ This trigger is already taken. Use a different one.' });
            }

            autoResponses.push({ trigger, response });
            await saveAutoResponsesForGroup(groupId, autoResponses);
            await client.sendMessage(msg.key.remoteJid, { text: `Auto-response added successfully!\nTrigger: ${trigger}\nResponse: ${response}` }, { quote: msg });
        } catch (error) {
            console.error('Failed to add auto-response:', error);
            await client.sendMessage(msg.key.remoteJid, { text: '❌ Failed to add auto-response. Try again later.' });
        }
    },
};