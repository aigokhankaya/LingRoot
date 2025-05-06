// frontend/src/components/BenefitsSection.jsx

export default function BenefitsSection() {
  const benefits = [
    {
      icon: "🧩",
      title: "Level-Appropriate Learning",
      description: "Content is tailored to your English level (A1–C2), so you learn at your pace.",
    },
    {
      icon: "⏱️",
      title: "Fits Your Daily Routine",
      description: "Learn English by listening to what you already consume daily — no extra effort needed.",
    },
    {
      icon: "🌐",
      title: "Real-World Materials",
      description: "You learn using authentic podcasts, videos, and articles — not outdated textbooks.",
    },
  ];

  return (
    <section className="bg-gray-50 py-20 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-12 text-gray-800">Why LingRoot?</h2>
      <div className="grid gap-10 md:grid-cols-3 max-w-6xl mx-auto">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-md p-8 hover:shadow-xl transition-all"
          >
            <div className="text-5xl mb-4">{benefit.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
            <p className="text-gray-600">{benefit.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
