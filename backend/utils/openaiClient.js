const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.getSuggestionsFromOpenAI = async (keyword) => {
  const prompt = `Suggest 10 English learning content ideas related to "${keyword}". Each should include a title and a 1-sentence summary. Return in JSON array format.`;

  const chat = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  const content = chat.choices[0]?.message?.content || '[]';
  return JSON.parse(content);
}; 