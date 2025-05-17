import React from 'react';

const DemoSection: React.FC = () => (
  <section className="py-16 bg-gray-100 text-center">
    <h2 className="text-3xl font-bold mb-6">See LingRoot in action</h2>
    <div className="flex justify-center">
      <iframe
        width="560"
        height="315"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  </section>
);

export default DemoSection; 