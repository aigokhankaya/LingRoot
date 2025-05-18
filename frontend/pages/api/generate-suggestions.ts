import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { interest } = req.body;

  const prompt = `You are a helpful assistant for English learners. Based on the interest "${interest}", generate 10 content suggestions. Each should have a title and a 1-sentence summary. Return in JSON array.`;

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = chat.choices[0].message.content;
    const suggestions = JSON.parse(responseText || '[]');
    res.status(200).json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI response failed' });
  }
} 