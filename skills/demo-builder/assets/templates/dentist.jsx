// Igil demo template — Dentist
// Codex uses this as structural scaffolding and replaces all content with real business data.

export default function DentistDemo() {
  return (
    <main className="font-sans text-gray-800 bg-white">

      {/* Hero */}
      <section className="bg-[#1B4F8A] text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-3">Your Smile, Our Priority</h1>
        <p className="text-lg text-blue-100 mb-8">Family & Cosmetic Dentistry in Austin, TX</p>
        <a href="tel:+1234567890"
           className="bg-white text-[#1B4F8A] font-semibold px-8 py-3 rounded-full hover:bg-blue-50 transition">
          Book an Appointment
        </a>
      </section>

      {/* About */}
      <section className="max-w-2xl mx-auto py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">About Our Practice</h2>
        <p className="text-gray-600 leading-relaxed">
          We provide comprehensive dental care for the whole family in a comfortable, modern environment.
          From routine cleanings to complete smile makeovers, we're here for every step of your dental journey.
        </p>
      </section>

      {/* Services */}
      <section className="bg-[#E8F4FD] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Teeth Whitening', 'Invisalign', 'Dental Implants', 'Emergency Care', 'Cleanings & Exams', 'Veneers'].map(s => (
              <div key={s} className="bg-white rounded-xl p-6 shadow-sm text-center">
                <p className="font-semibold text-[#1B4F8A]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-bold text-center mb-10">What Patients Say</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { name: 'Sarah M.', text: 'Best dental experience I've had. Professional team and pain-free treatment.' },
            { name: 'James R.', text: 'They transformed my smile. The Invisalign results exceeded my expectations.' },
            { name: 'Linda K.', text: 'Always welcoming and thorough. I've been coming here for 5 years.' },
          ].map(r => (
            <div key={r.name} className="bg-[#E8F4FD] rounded-xl p-6">
              <p className="text-yellow-500 mb-2">★★★★★</p>
              <p className="text-gray-700 text-sm mb-3">"{r.text}"</p>
              <p className="font-semibold text-sm text-[#1B4F8A]">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[#1B4F8A] text-white py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
        <p className="mb-2">📍 123 Main St, Austin, TX 78701</p>
        <p className="mb-2">📞 (512) 000-0000</p>
        <p className="mb-6">✉️ hello@yourdentist.com</p>
        <a href="tel:+15120000000"
           className="bg-white text-[#1B4F8A] font-semibold px-8 py-3 rounded-full hover:bg-blue-50 transition">
          Call Now
        </a>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center bg-gray-900">
        <p className="text-xs text-gray-300 opacity-40 mt-4">
          Site by <a href="https://murusmare.com" className="underline">Murus Mare</a>
        </p>
      </footer>

    </main>
  );
}
