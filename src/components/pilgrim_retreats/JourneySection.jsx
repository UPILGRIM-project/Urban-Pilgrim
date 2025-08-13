export default function JourneySection() {
  return (
    <div className="max-w-7xl mx-auto md:px-6 pt-0 pb-8 space-y-10 text-[#111]">
      {/* Section 1: Introduction */}
      <section className="space-y-4">
        <h2 className="md:text-2xl text-xl font-bold">The Journey Inward Begins</h2>
        <p className="text-sm">
          Welcome to the Urban Pilgrim Retreat — an invitation to return to your natural rhythm.
          Step away from the noise, the deadlines, and the daily grind—and into a space where the air is crisp,
          the silence is sacred, and your soul has room to breathe.
        </p>
        <p className="text-sm">
          <strong>Rejuvenate in the Himalayas</strong> is a 4-day immersive retreat designed to help you pause, reset,
          and reconnect with yourself in the tranquil village of <strong>Kailasha, Kasol</strong>. Blending gentle
          wellness practices, Himalayan nature trails, mindful rituals, and moments of stillness, this retreat offers
          more than rest—it offers renewal. Come home to your calm, your clarity, your center.
        </p>
      </section>

      {/* Section 2: Location */}
      <section className="space-y-4">
        <h3 className="text-md font-semibold">Location map</h3>
        <p className="text-sm">
          <strong>Kailasha – The Himalayan Village</strong> is a glorious mix of style, top class facilities, where the
          traditional architecture & aesthetics blend harmoniously. 'Kailasha – The Himalayan village' is an ideal
          place to rejuvenate amongst nature and its ways. The property is located at Kasol, Himachal Pradesh.
        </p>
        <img
          src="/assets/location.svg"
          alt="Location map"
          className="rounded-xl shadow-lg w-full h-auto min-h-40 object-cover"
        />
      </section>

      {/* Section 3: Instructions */}
      <section className="space-y-4">
        <h3 className="text-md font-semibold mb-2">Instructions to get there</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
          <li>Arrive at the designated entry point in Bhubaneswar 30 minutes before your session.</li>
          <li>Show your Pilgrim Pass & ID proof for verification.</li>
          <li>Follow the security & dress code guidelines.</li>
          <li>Enjoy your pilgrimage!</li>
        </ul>
        <h3 className="text-md font-semibold mb-2">Wellness Immersion</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
          <li>Expert led opening circle with breathwork, journaling and intent setting</li>
          <li>Yoga Sessions with Yoga Guide</li>
          <li>Meditation and healing Sessions – Sound Healing, Chakra meditation, **</li>
          <li>Personal Healing Sessions with Experts (optional)</li>
        </ul>
        <h2 className="text-md font-semibold mb-2">Nature exploration</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
          <li>Walk in the pristine Himalayan forests with 240 varieties of exotic birds</li>
          <li>Visit Agri farms and Apple orchard. Enjoy panoramic view of the Himalayas.</li>
        </ul>
        <h2 className="text-md font-semibold mb-2">Soulful excursions</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
          <li>Excursion to Manikaran, a town of great historic significance</li>
          <li>Dip in hot springs</li>
          <li>Visit a local village at Kasol and enjoy lunch with the locals</li>
        </ul>
        <h2 className="text-md font-semibold mb-2">Nourishing Meals</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
          <li>Specially curated breakfast, lunch, high tea and dinner on daily basis</li>
          <li>Dinner under the stars with bon fire and Sufi music</li>
        </ul>
      </section>
    </div>
  );
}
