// Igil demo template — Aesthetic Clinic
// Codex uses this as structural scaffolding and replaces all content with real business data.

export default function AestheticClinicDemo() {
  return (
    <main className="font-sans text-gray-800 bg-white">

      {/* Hero */}
      <section className="bg-[#F5E6E0] py-24 px-6 text-center">
        <p className="text-xs tracking-widest text-[#C9A96E] uppercase mb-4">Premium Aesthetics</p>
        <h1 className="text-4xl font-light text-gray-900 mb-4">Glow with Confidence</h1>
        <p className="text-gray-500 mb-8">Advanced skincare & aesthetic treatments in Nashville, TN</p>
        <a href="tel:+1234567890"
           className="border border-[#C9A96E] text-[#C9A96E] px-10 py-3 rounded-full text-sm hover:bg-[#C9A96E] hover:text-white transition">
          Book a Consultation
        </a>
      </section>

      {/* Treatments */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-light text-center mb-10">Our Treatments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {['Botox & Fillers', 'Laser Hair Removal', 'Chemical Peels', 'Microneedling', 'IV Therapy', 'Body Contouring'].map(t => (
            <div key={t} className="border border-[#F5E6E0] rounded-2xl p-6 text-center hover:border-[#C9A96E] transition">
              <p className="font-medium text-gray-700">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-[#1A1A1A] text-white py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-light mb-4">Our Approach</h2>
          <p className="text-gray-400 leading-relaxed">
            We believe in results-driven aesthetics tailored to each individual. Our licensed practitioners
            use only FDA-approved treatments in a private, luxurious environment.
          </p>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-light text-center mb-10">Client Stories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { name: 'Rachel T.', text: 'The most natural-looking results I've ever had. I'll never go anywhere else.' },
            { name: 'Monica S.', text: 'Professional, discreet, and exceptional. My skin has never looked better.' },
            { name: 'Diane L.', text: 'Worth every penny. The staff made me feel completely at ease.' },
          ].map(r => (
            <div key={r.name} className="bg-[#F5E6E0] rounded-2xl p-6">
              <p className="text-[#C9A96E] mb-2">★★★★★</p>
              <p className="text-gray-700 text-sm mb-3 italic">"{r.text}"</p>
              <p className="font-medium text-sm">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[#F5E6E0] py-16 px-6 text-center">
        <h2 className="text-2xl font-light mb-6">Visit Us</h2>
        <p className="mb-2 text-gray-600">📍 456 Belle Meade Blvd, Nashville, TN 37205</p>
        <p className="mb-2 text-gray-600">📞 (615) 000-0000</p>
        <p className="mb-6 text-gray-600">✉️ hello@aestheticclinic.com</p>
        <a href="tel:+16150000000"
           className="border border-[#C9A96E] text-[#C9A96E] px-10 py-3 rounded-full text-sm hover:bg-[#C9A96E] hover:text-white transition">
          Book Now
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
