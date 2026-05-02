const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const input = {
    prompt: 'Respond with exactly: {"upcoding":{"type":"NONE","description":"test","severity":"NONE"},"unbundling":{"type":"NONE","description":"test","severity":"NONE"},"ai_reasoning":"test"}',
    options: { temperature: 0.1, maxTokens: 512 }
  };
  
  console.log('Sending request to Groq...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: input.prompt }],
        temperature: input.options.temperature,
        max_tokens: input.options.maxTokens,
      }),
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
