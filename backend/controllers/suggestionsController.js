const { getSuggestionsFromOpenAI } = require('../utils/openaiClient');

exports.generateSuggestions = async (req, res) => {
  const { interest_keyword, user_id } = req.body;

  if (!interest_keyword) {
    return res.status(400).json({ error: 'Missing interest_keyword' });
  }

  try {
    const suggestions = await getSuggestionsFromOpenAI(interest_keyword);

    // Gelecekte DB'ye kaydetmek istersen burada yapılabilir

    res.status(200).json(suggestions);
  } catch (err) {
    console.error('Suggestion generation failed:', err);
    res.status(500).json({ error: 'OpenAI API error' });
  }
}; 