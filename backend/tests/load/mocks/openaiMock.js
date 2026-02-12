/**
 * OpenAI Mock Responses for Load Testing
 *
 * Provides deterministic responses for CEFR adaptation,
 * translation, bilingual content, mood analysis, and chapter analysis.
 */

const MOCK_ADAPTED_TEXT = `The sun was shining brightly over the small town. People walked slowly along the quiet streets. A young girl sat near the river, reading a book about animals. She liked learning new things every day. The birds sang beautiful songs in the trees above her. It was a peaceful morning, and everyone felt happy. The market opened early, and fresh fruit filled the wooden tables. Children played in the park while their parents talked and laughed together.`;

const MOCK_TRANSLATED_TEXT = `The morning light came through the window softly. Maria opened her eyes and smiled. Today was going to be a good day. She got dressed quickly and went to the kitchen. Her mother was making breakfast. The smell of fresh bread filled the room. They sat together and talked about their plans. Maria wanted to visit the library after school. She loved reading stories about different places in the world.`;

const MOCK_BILINGUAL_RESPONSE = {
  english_text: `The old lighthouse stood tall on the rocky cliff. Every night, its bright light guided ships safely through the dark waters. The keeper, an elderly man named Thomas, had worked there for thirty years. He knew every sound the sea made. When storms came, he stayed awake all night, watching the waves crash against the rocks below. The sailors always felt safe when they saw the lighthouse beam cutting through the fog.`,
  translated_text: `Eski deniz feneri kayalık uçurumun üzerinde uzun boylu duruyordu. Her gece, parlak ışığı gemileri karanlık sularda güvenle yönlendiriyordu. Bekçi, Thomas adında yaşlı bir adam, orada otuz yıldır çalışıyordu. Denizin çıkardığı her sesi biliyordu. Fırtınalar geldiğinde, bütün gece uyanık kalır, dalgaların aşağıdaki kayalara çarpmasını izlerdi. Denizciler, deniz fenerinin ışığının sisin içinden geçtiğini gördüklerinde her zaman güvende hissederlerdi.`,
};

const MOCK_USAGE = {
  prompt_tokens: 150,
  completion_tokens: 200,
  total_tokens: 350,
};

const MOCK_PODCAST_SCRIPT = {
  title: 'Load Test Podcast Episode',
  turns: [
    { speaker: 'A', text: 'Welcome to our show today. We have a really interesting topic to discuss.' },
    { speaker: 'B', text: 'Thanks for having me. I am excited to talk about this.' },
    { speaker: 'A', text: 'So, let us start with the basics. What do you think is the most important thing about learning a new language?' },
    { speaker: 'B', text: 'Well, I think the most important thing is practice. You need to use the language every day. Listening to podcasts is a great way to do that.' },
    { speaker: 'A', text: 'That is a great point. And what about vocabulary? How do you recommend building it?' },
    { speaker: 'B', text: 'Reading is key. When you read stories or articles at your level, you naturally pick up new words. Context helps you remember them better than just memorizing lists.' },
    { speaker: 'A', text: 'Interesting. So you would say that immersion is more effective than traditional study methods?' },
    { speaker: 'B', text: 'Absolutely. Your brain learns best when the language feels natural and meaningful to you. That is why listening to conversations like this one can be so helpful.' },
    { speaker: 'A', text: 'Well, that is wonderful advice. Thank you for sharing your insights with us today.' },
    { speaker: 'B', text: 'Thank you. It was a pleasure. Keep practicing everyone.' },
  ],
  turns_original: [
    { speaker: 'A', text: 'Bugunku programimiza hosgeldiniz. Tartisacak gercekten ilginc bir konumuz var.' },
    { speaker: 'B', text: 'Beni davet ettiginiz icin tesekkurler. Bu konuyu konusmak icin heyecanlaniyorum.' },
    { speaker: 'A', text: 'Peki, temellerle baslayalim. Yeni bir dil ogrenmede en onemli sey nedir sizce?' },
    { speaker: 'B', text: 'Bence en onemli sey pratik yapmak. Dili her gun kullanmaniz gerekiyor. Podcast dinlemek bunu yapmanin harika bir yolu.' },
    { speaker: 'A', text: 'Cok guzel bir nokta. Peki kelime hazinesi? Onu gelistirmek icin ne onerirsiniz?' },
    { speaker: 'B', text: 'Okuma cok onemli. Seviyenize uygun hikayeler veya makaleler okudugunda dogal olarak yeni kelimeler ogrenirsiniz.' },
    { speaker: 'A', text: 'Ilginc. Yani dalmanin geleneksel calisma yontemlerinden daha etkili oldugunu mu soylersiniz?' },
    { speaker: 'B', text: 'Kesinlikle. Beyniniz dil dogal ve anlamli hissettirdiginde en iyi ogrenir.' },
    { speaker: 'A', text: 'Harika bir tavsiye. Bugun goruslerinizi paylastiginiz icin tesekkurler.' },
    { speaker: 'B', text: 'Tesekkurler. Zevkle. Herkes pratik yapmaya devam etsin.' },
  ],
};

module.exports = {
  MOCK_ADAPTED_TEXT,
  MOCK_TRANSLATED_TEXT,
  MOCK_BILINGUAL_RESPONSE,
  MOCK_USAGE,
  MOCK_PODCAST_SCRIPT,
};
