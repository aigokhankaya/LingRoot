import React from 'react';

const FinalCtaSection: React.FC = () => {
  return (
    <section className="bg-blue-700 text-white py-20 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6">
        Try it for Free – No Signup Needed
      </h2>
      <p className="text-lg mb-8 max-w-xl mx-auto text-blue-100">
        Instantly convert any YouTube, Spotify or text content into your level of English and start learning now.
      </p>
      <a
        href="#"
        className="inline-block bg-white text-blue-700 font-semibold py-3 px-6 rounded-xl hover:bg-blue-100 transition-all duration-300 shadow-lg"
      >
        Get Started
      </a>
    </section>
  );
};

export default FinalCtaSection; 