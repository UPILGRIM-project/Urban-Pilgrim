const PilgrimGuide = () => {
  return (
    <section className="bg-[#1F4B6E] text-white px-6 py-12 w-screen">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-10 md:items-start items-center">
        <img
          src="/assets/Anisha.png"
          alt="Pilgrim Guide"
          className="w-auto md:h-full md:max-h-none max-h-90 rounded-lg shadow-lg object-cover"
        />

        <div className="text-sm leading-relaxed">
          <h2 className="text-white text-xl font-semibold mb-4">Meet your Pilgrim Guide</h2>

          <p className="mb-4">
            Anisha is an AcuYoga Therapist from Bombay, India, blending the ancient sciences of acupuncture and yoga with energy-based healing to help people reconnect with their inner flow.
          </p>

          <p className="mb-4">
            Originally trained as an architect and programmer, she followed her deeper calling in wellness and energy medicine. Over the past 20 years, she has worked extensively with individuals across India and internationally, facilitating retreats and healing experiences in Dubai, Madrid, and New York.
          </p>

          <p className="mb-2">Her yoga journey began with certifications from:</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Kaivalyadham Yoga Institute, Lonavala</li>
            <li>Krishnamacharya Yoga Mandiram, Chennai</li>
            <li>The Yoga Institute, Santacruz</li>
          </ul>

          <p className="mb-2">
            She is also a registered Acupuncture Therapist with the Maharashtra Government, trained through the Indian Academy of Acupuncture Science, and certified in:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Reiki</li>
            <li>Pranic Healing</li>
            <li>Sound Healing Therapy</li>
          </ul>

          <p>
            Through this multi-dimensional path, she has developed a unique therapeutic approach called AcuYoga Meditation — an integration of bodywork, breath, subtle energy balancing, and mindfulness.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PilgrimGuide;
