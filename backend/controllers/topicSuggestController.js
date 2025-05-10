const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.suggestTopics = async (req, res) => {
  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ success: false, message: "No input provided." });
  }
  const prompt = `Based on the keyword '${input}', suggest 5 different, specific and engaging spoken-content topics suitable for a 15-minute narration. Each topic should be detailed and clearly described in 1-2 sentences so the user can easily choose. Return only the list of topics with their descriptions, no explanations or extra text.`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant for topic suggestions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    const suggestions = text.split(/\n+/).filter(Boolean).map(s => s.replace(/^[0-9\-\.\)]*\s*/, ''));
    res.json({ success: true, suggestions, prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: "OpenAI error", error: err.message });
  }
}; 