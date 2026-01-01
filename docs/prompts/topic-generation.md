# Topic Generation Prompts

**Last Updated:** December 2025  
**Location:** `/backend/prompts/`

## Overview

Topic generation prompts handle the creation of personalized learning content based on user interests, CEFR level, and the topic hierarchy system.

## Prompt Files

| File | Purpose |
|------|---------|
| `topic_extractor.txt` | Extract learning topics from conversations |
| `topic_detail_suggestions.txt` | Generate detailed topic suggestions |
| `topic_hierarchy/generate_subtopics.txt` | Generate subtopics with anti-repetition rules |
| `liro_daily_suggestions.txt` | Daily personalized topic recommendations |
| `hobby_200_suggestions.txt` | Hobby-based topic suggestions |
| `content/content_generation_A1.txt` | A1 level content with quality rules |
| `content/content_generation_A2.txt` | A2 level content with anti-repetition |
| `cefr_A1.txt` | CEFR A1 adaptation with pronoun rules |

## Topic Hierarchy System

### Structure

```
Category (Level 0)
└── Subcategory (Level 1)
    └── Topic (Level 2)
        └── Subtopic (Level 3)
```

### Example

```
Daily Life
├── Food & Cooking
│   ├── Recipes
│   │   ├── Breakfast Recipes
│   │   ├── Quick Dinners
│   │   └── Healthy Snacks
│   ├── Restaurants
│   └── Grocery Shopping
├── Shopping
│   ├── Clothes Shopping
│   └── Online Shopping
└── Home & Family
    ├── Household Chores
    └── Family Relationships
```

## Prompt Details

### topic_extractor.txt

```text
Analyze the given conversation and extract learning topics.

## Task:
Identify topics that could be expanded into learning content for the user.

## Output Format (JSON):
{
  "mainTopic": {
    "title": "string",
    "category": "string",
    "cefrSuitability": ["A1", "A2", "B1", "B2", "C1", "C2"]
  },
  "relatedTopics": [
    {
      "title": "string",
      "relevance": 0.0-1.0
    }
  ],
  "vocabularyThemes": ["string"],
  "grammarPatterns": ["string"]
}

## Conversation:
{conversation}
```

### topic_detail_suggestions.txt

```text
Based on the given topic and user profile, generate detailed subtopics for learning.

## User Profile:
- CEFR Level: {level}
- Native Language: {native_lang}
- Interests: {interests}

## Topic: {topic}

## Generate:
1. 5-10 subtopics appropriate for the user's level
2. Key vocabulary for each subtopic
3. Suggested grammar focus
4. Estimated learning time

## Output Format (JSON):
{
  "topic": "string",
  "subtopics": [
    {
      "title": "string",
      "description": "string",
      "vocabulary": ["string"],
      "grammarFocus": "string",
      "estimatedMinutes": number
    }
  ]
}
```

### liro_daily_suggestions.txt

```text
Generate personalized daily topic suggestions for the user.

## User Profile:
- Name: {name}
- CEFR Level: {level}
- Native Language: {native_lang}
- Target Language: {target_lang}
- Interests: {interests}
- Recent Topics: {recent_topics}
- Time of Day: {time}
- Day of Week: {day}

## Requirements:
1. Suggest 3-5 topics
2. Match user's level
3. Align with interests
4. Avoid recently covered topics
5. Consider time of day (morning: energetic, evening: relaxed)
6. Include variety (conversation, grammar, vocabulary)

## Output Format (JSON):
{
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "type": "conversation|grammar|vocabulary|reading",
      "difficulty": "easy|medium|challenging",
      "estimatedMinutes": number,
      "reason": "string"
    }
  ],
  "dailyTip": "string"
}
```

### hobby_200_suggestions.txt

```text
Based on the user's hobby interest, generate relevant language learning topics.

## Hobby Category: {category}
## User Level: {level}

## Generate:
200 topic ideas organized by subcategory, each with:
- Topic title
- Brief description
- CEFR level suitability
- Key vocabulary (5 words)

## Categories to cover:
- Basic terminology
- Common scenarios
- Advanced discussions
- Cultural aspects
- Practical applications
```

## Topic Pipeline

### Content Generation Flow

```
User Selects Topic → Generate Outline → Create Content → 
Add Vocabulary → Generate Audio → Store Result
```

### Implementation

```javascript
// controllers/topicPipelineController.js
async function generateTopicContent(topicId, userId, options) {
  const topic = await getTopicById(topicId);
  const user = await getUserProfile(userId);
  
  // Step 1: Generate content outline
  const outline = await generateOutline(topic, user.cefrLevel);
  
  // Step 2: Generate full content
  const content = await generateContent(outline, user.cefrLevel);
  
  // Step 3: Generate bilingual version if requested
  let bilingualContent = null;
  if (options.generateBilingual) {
    bilingualContent = await translateFromEnglish(
      content, 
      user.cefrLevel, 
      user.nativeLanguage
    );
  }
  
  // Step 4: Generate audio
  const audioUrl = await generateAudio(content, options.voice, options.rate);
  
  // Step 5: Store result
  const result = await storeContent({
    userId,
    topicId,
    content,
    bilingualContent,
    audioUrl,
    level: user.cefrLevel
  });
  
  return result;
}
```

### Outline Generation

```javascript
async function generateOutline(topic, level) {
  const prompt = `
    Create a learning content outline for:
    Topic: ${topic.title}
    Level: ${level}
    
    Include:
    1. Introduction (2-3 sentences)
    2. Main points (3-5 points)
    3. Key vocabulary (5-10 words)
    4. Practice questions (2-3 questions)
    5. Conclusion (1-2 sentences)
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## Topic Hierarchy Controller

```javascript
// controllers/topicHierarchyController.js
async function getTopicTree(level, language) {
  const topics = await db('topic_hierarchy')
    .where('language', language)
    .whereRaw('? = ANY(cefr_levels)', [level])
    .orderBy(['parent_id', 'order']);
  
  return buildTree(topics);
}

async function suggestTopicsForUser(userId) {
  const user = await getUserProfile(userId);
  const interests = await getUserInterests(userId);
  const recentTopics = await getRecentTopics(userId);
  
  const prompt = fs.readFileSync('prompts/liro_daily_suggestions.txt', 'utf-8')
    .replace('{name}', user.name)
    .replace('{level}', user.cefrLevel)
    .replace('{interests}', interests.join(', '))
    .replace('{recent_topics}', recentTopics.join(', '));
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## Embedding-Based Suggestions

```javascript
// utils/liroContentGraph.js
async function findSimilarTopics(userProfile, limit = 5) {
  // Create embedding from user's interests
  const interestText = userProfile.interests.join('. ');
  const embedding = await createEmbedding(interestText);
  
  // Find similar topics using cosine similarity
  const topics = await db('topics')
    .select('*')
    .whereNotNull('embedding');
  
  const scored = topics.map(topic => ({
    ...topic,
    similarity: cosineSimilarity(embedding, JSON.parse(topic.embedding))
  }));
  
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

## Quality Guidelines

### Topic Appropriateness

| Level | Topic Complexity | Examples |
|-------|------------------|----------|
| A1 | Concrete, familiar | Family, food, colors |
| A2 | Everyday situations | Shopping, directions, weather |
| B1 | Familiar topics | Work, hobbies, travel |
| B2 | Abstract topics | News, opinions, culture |
| C1 | Complex topics | Politics, philosophy, science |
| C2 | Specialized topics | Academic, professional |

### Content Length

| Level | Word Count | Sentences |
|-------|------------|-----------|
| A1 | 50-100 | 8-12 |
| A2 | 100-150 | 12-18 |
| B1 | 150-250 | 18-25 |
| B2 | 250-400 | 25-35 |
| C1 | 400-600 | 35-50 |
| C2 | 600+ | 50+ |

## Content Quality Validation

**Last Updated:** January 2026  
**Location:** `/backend/utils/`

### Overview

Content quality is enforced at two levels:
1. **Prompt-level:** Anti-repetition rules embedded in prompts
2. **Code-level:** Post-generation validation utilities

### Quality Validator (`contentQualityValidator.js`)

Validates generated content for common quality issues:

| Check | Severity | Threshold |
|-------|----------|-----------|
| Consecutive same-starter | HIGH | Max 2 sentences |
| Forbidden patterns | MEDIUM | Max 1 occurrence |
| Filler ratio | MEDIUM | Max 15% |

```javascript
const { validateContent } = require('../utils/contentQualityValidator');

const result = validateContent(generatedText);
// { valid: boolean, score: 0-100, issues: [...] }
```

**Forbidden Patterns:**
- "It is good" / "It is important" / "It is nice"
- "People like it" / "People are happy"
- "This is good for..." / "Everyone can..."

### Cross-Topic Duplicate Checker (`crossTopicDuplicateChecker.js`)

Detects content overlap between sibling subtopics:

```javascript
const { checkCrossTopicDuplicates } = require('../utils/crossTopicDuplicateChecker');

const result = await checkCrossTopicDuplicates(supabase, topicId, parentId, contentText);
// { hasDuplicates: boolean, duplicates: [...], entities: [...] }
```

**Detected Entities:**
- Hagia Sophia, Topkapi Palace, Blue Mosque, Galata Tower
- Grand Bazaar, Bosphorus
- Proper nouns (2+ word capitalized phrases)

### Pipeline Integration

Quality validation runs automatically in `topicPipelineController.js`:

```javascript
// After bilingual content generation
const qualityValidation = validateContent(result.adapted_text);
result.qualityScore = qualityValidation.score;
result.qualityIssues = qualityValidation.issues;

if (!qualityValidation.valid) {
  logger.warn('Content quality validation failed', qualityValidation.issues);
}
```

## Related Documentation

- [CEFR Conversion](./cefr-conversion.md)
- [Liro Assistant](./liro-assistant.md)
- [AI Pipeline](../architecture/ai-pipeline.md)
