import React from 'react';

const HowItWorksSection: React.FC = () => (
  <section className="py-16 bg-gray-50 text-center">
    <h2 className="text-3xl font-bold mb-6">How it works?</h2>
    <ol className="flex flex-col md:flex-row justify-center items-center gap-8">
      <li className="bg-white rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">1️⃣</span>
        <p>Paste a YouTube link, Spotify podcast, or enter your own text.</p>
      </li>
      <li className="bg-white rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">2️⃣</span>
        <p>Choose your English level and voice.</p>
      </li>
      <li className="bg-white rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">3️⃣</span>
        <p>Listen to the generated audio and follow along with captions.</p>
      </li>
    </ol>
  </section>
);

export default HowItWorksSection; 