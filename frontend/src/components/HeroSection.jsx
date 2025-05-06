// frontend/src/components/HeroSection.jsx

export default function HeroSection() {
  return (
    <section className="bg-white text-center py-20 px-4">
      <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        Your routines <span className="text-blue-600">turn into English</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        Turn your favorite YouTube videos, Spotify podcasts or text into English audio – personalized to your level.
      </p>
      <a
        href="#"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-md"
      >
        Start Now
      </a>
    </section>
  );
}
