// Igil demo template — Local Service (plumber, electrician, HVAC, etc.)
// Codex uses this as structural scaffolding and replaces all content with real business data.

export default function LocalServiceDemo() {
  return (
    <main className="font-sans text-gray-800 bg-white">

      {/* Hero */}
      <section className="bg-[#1E3A8A] text-white py-20 px-6 text-center">
        <p className="text-sm text-blue-200 mb-2">Licensed & Insured · Denver, CO</p>
        <h1 className="text-4xl font-bold mb-3">Fast. Reliable. Local.</h1>
        <p className="text-blue-100 mb-8">Professional plumbing services you can trust</p>
        <a href="tel:+1234567890"
           className="bg-[#F97316] text-white font-semibold px-8 py-3 rounded-full hover:bg-orange-600 transition">
          Get a Free Quote
        </a>
      </section>

      {/* Trust Badges */}
      <section className="bg-gray-50 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          {['✅ Licensed & Insured', '⚡ Same-Day Service', '📍 Local to Denver', '🔧 10+ Years Experience', '⭐ 4.9 Google Rating'].map(b => (
            <span key={b} className="font-medium">{b}</span>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-bold text-center mb-10">Our Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {['Emergency Repairs', 'Drain Cleaning', 'Water Heater Install', 'Leak Detection', 'Bathroom Remodels', 'Commercial Plumbing'].map(s => (
            <div key={s} className="border-l-4 border-[#F97316] pl-4 py-2">
              <p className="font-semibold text-[#1E3A8A]">{s}</p>
              <p className="text-sm text-gray-500 mt-1">Professional & guaranteed</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">What Customers Say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { name: 'Mike T.', text: 'Called at 7am for a burst pipe. They were here within an hour. Incredible service.' },
              { name: 'Laura P.', text: 'Fair pricing and quality work. Fixed what two other plumbers couldn\'t.' },
              { name: 'Greg S.', text: 'Honest, professional, and fast. My go-to plumber for everything.' },
            ].map(r => (
              <div key={r.name} className="bg-white rounded-xl p-6 shadow-sm">
                <p className="text-yellow-500 mb-2">★★★★★</p>
                <p className="text-gray-600 text-sm mb-3">"{r.text}"</p>
                <p className="font-semibold text-sm text-[#1E3A8A]">{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[#1E3A8A] text-white py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
        <p className="mb-2">📍 Denver, CO — Serving Metro Area</p>
        <p className="mb-2">📞 (720) 000-0000</p>
        <p className="mb-6">✉️ hello@localplumber.com</p>
        <a href="tel:+17200000000"
           className="bg-[#F97316] text-white font-semibold px-8 py-3 rounded-full hover:bg-orange-600 transition">
          Call Now — Available 24/7
        </a>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center bg-gray-900">
        <p className="text-xs text-gray-600 opacity-40">
          Site by <a href="https://murusmare.com" className="underline">Murus Mare</a>
        </p>
      </footer>

    </main>
  );
}
