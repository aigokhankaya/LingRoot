export default function HowItWorksSection() {
  const steps = [
    { title: 'Paste YouTube, Spotify, Text, or File' },
    { title: 'Choose your English level' },
    { title: 'Listen as English audio' },
  ];

  return (
    <section className="py-16 bg-gray-100 text-center">
      <h2 className="text-3xl font-bold mb-10">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow hover:shadow-md transition">
            <div className="text-4xl font-bold text-blue-600 mb-2">{index + 1}</div>
            <p className="text-lg">{step.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
