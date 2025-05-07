import React from 'react';

const BenefitsSection: React.FC = () => (
  <section className="py-16 bg-white text-center">
    <h2 className="text-3xl font-bold mb-6">Why LingRoot?</h2>
    <div className="flex flex-col md:flex-row justify-center items-center gap-8">
      <div className="bg-blue-50 rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">🎧</span>
        <p>Practice listening with real-life content.</p>
      </div>
      <div className="bg-blue-50 rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">🗣️</span>
        <p>Choose your level and voice for personalized audio.</p>
      </div>
      <div className="bg-blue-50 rounded-xl shadow-md p-6 w-64">
        <span className="block text-4xl mb-2">📚</span>
        <p>Improve your vocabulary and pronunciation.</p>
      </div>
    </div>
  </section>
);

export default BenefitsSection; 