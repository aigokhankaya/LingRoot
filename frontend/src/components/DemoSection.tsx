import React from 'react';

const DemoSection: React.FC = () => {
  return (
    <section className="bg-white py-20 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
        Try a Demo
      </h2>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
        Listen to an example of how LingRoot transforms real content into English audio personalized for your level.
      </p>

      <div className="bg-gray-100 rounded-2xl p-8 max-w-xl mx-auto shadow-md">
        <p className="text-gray-700 mb-4">
          &quot;In this video, we explore how coffee affects your brain and what neuroscientists say about your daily cup.&quot;
        </p>

        <audio controls className="w-full rounded-xl">
          <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>

        <p className="text-sm text-gray-400 mt-4 italic">
          Example: B1 Level - Adapted from a YouTube documentary
        </p>
      </div>
    </section>
  );
};

export default DemoSection; 