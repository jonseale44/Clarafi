import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAssistantInfo() {
  try {
    const assistantId = 'asst_xDrbaHCNXWw7VrMdU97UWLjW';
    const threadId = 'thread_Uxh8RRUiTX2357N7CdRxmCzD';
    
    console.log('🤖 Retrieving assistant information...');
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    
    console.log('\n=== ROBERT CHEN\'S ASSISTANT ===');
    console.log('Assistant ID:', assistant.id);
    console.log('Name:', assistant.name);
    console.log('Model:', assistant.model);
    console.log('Description:', assistant.description);
    console.log('Instructions (first 500 chars):', assistant.instructions?.substring(0, 500) + '...');
    console.log('Tools:', assistant.tools?.map(t => t.type));
    console.log('Created:', new Date(assistant.created_at * 1000).toLocaleString());
    
    console.log('\n=== THREAD MESSAGES ===');
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: 10,
      order: 'desc'
    });
    
    console.log(`Found ${messages.data.length} messages in thread:`);
    messages.data.forEach((msg, index) => {
      console.log(`\n${index + 1}. [${msg.role.toUpperCase()}] ${new Date(msg.created_at * 1000).toLocaleString()}`);
      if (msg.content[0]?.text?.value) {
        console.log(msg.content[0].text.value.substring(0, 300) + '...');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getAssistantInfo();