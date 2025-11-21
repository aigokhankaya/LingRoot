import React from 'react';

const FinalCtaSection: React.FC = () => {
  return (
    <section className="bg-slate-900 text-slate-50 py-20 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6">
        Try it for Free – No Signup Needed
      </h2>
      <p className="text-lg mb-8 max-w-xl mx-auto text-slate-300">
        Instantly convert any YouTube, Spotify or text content into your level of English and start learning now.
      </p>
      <a
        href="#"
        className="inline-block bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-300 hover:bg-primary/90"
      >
        Get Started
      </a>
    </section>
  );
};

export default FinalCtaSection; 