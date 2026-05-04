// Igil demo template — Boutique Hotel
// Codex uses this as structural scaffolding and replaces all content with real business data.

export default function BoutiqueHotelDemo() {
  return (
    <main className="font-sans text-gray-800 bg-[#F5F0E8]">

      {/* Hero */}
      <section className="bg-[#2D4A3E] text-white py-28 px-6 text-center">
        <p className="text-xs tracking-widest text-[#A8C5A0] uppercase mb-4">Savannah, Georgia</p>
        <h1 className="text-5xl font-light mb-4">The Birch House</h1>
        <p className="text-gray-300 mb-8 text-lg">A curated retreat in the heart of the historic district</p>
        <a href="tel:+1234567890"
           className="border border-white text-white px-10 py-3 rounded-full text-sm hover:bg-white hover:text-[#2D4A3E] transition">
          Check Availability
        </a>
      </section>

      {/* Rooms */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-light text-center mb-10 text-[#2D4A3E]">Rooms & Suites</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { name: 'Garden Room', desc: 'King bed, private terrace, courtyard views.' },
            { name: 'Heritage Suite', desc: 'Separate living area, original hardwood floors, fireplace.' },
            { name: 'Birch Penthouse', desc: 'Two-level suite with rooftop terrace and panoramic views.' },
          ].map(r => (
            <div key={r.name} className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="font-medium text-[#2D4A3E] mb-2">{r.name}</p>
              <p className="text-sm text-gray-500">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-[#2D4A3E] text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-light text-center mb-10">Amenities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm text-gray-300">
            {['Spa & Wellness', 'Farm-to-Table Dining', 'Concierge Service', 'Curated Tours',
              'Free WiFi', 'Valet Parking', 'Private Events', 'Pet Friendly'].map(a => (
              <div key={a} className="border border-[#3D5A4E] rounded-xl py-4 px-2">{a}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-light text-center mb-10 text-[#2D4A3E]">Guest Stories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { name: 'Thomas W.', text: 'An unforgettable stay. Every detail was thoughtfully considered.' },
            { name: 'Claire B.', text: 'We\'ve stayed at many boutique hotels — this is the best.' },
            { name: 'Anna & Jeff', text: 'Perfect for our anniversary. The staff went above and beyond.' },
          ].map(r => (
            <div key={r.name} className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-[#8B7355] mb-2">★★★★★</p>
              <p className="text-gray-600 text-sm mb-3 italic">"{r.text}"</p>
              <p className="font-medium text-sm text-[#2D4A3E]">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[#8B7355] text-white py-16 px-6 text-center">
        <h2 className="text-2xl font-light mb-6">Find Us</h2>
        <p className="mb-2">📍 12 Bull St, Savannah, GA 31401</p>
        <p className="mb-2">📞 (912) 000-0000</p>
        <p className="mb-6">✉️ stay@thebirchhousehotel.com</p>
        <a href="tel:+19120000000"
           className="border border-white text-white px-10 py-3 rounded-full text-sm hover:bg-white hover:text-[#8B7355] transition">
          Reserve Now
        </a>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center bg-[#1A1A1A]">
        <p className="text-xs text-gray-600 opacity-40">
          Site by <a href="https://murusmare.com" className="underline">Murus Mare</a>
        </p>
      </footer>

    </main>
  );
}
