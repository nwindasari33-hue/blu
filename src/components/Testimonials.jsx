import React from 'react';

const testimonials = [
  {
    id: 1,
    name: 'Anisa Pratiwi',
    initials: 'AP',
    rating: 5,
    text: 'Papannya cantik banget! Bunga-bunganya terlihat sangat elegan dan tulisannya rapi. Respon admin juga cepat. Sangat direkomendasikan untuk wisuda!',
    date: '15 Juni 2025',
    color: '#FFB6C1'
  },
  {
    id: 2,
    name: 'Dewi Kusuma',
    initials: 'DK',
    rating: 5,
    text: 'Sewa di sini untuk wisuda adik saya. Kualitasnya premium, akriliknya bening dan bersih. Pengiriman juga tepat waktu. Pasti bakal pesan lagi!',
    date: '22 Juni 2025',
    color: '#C8A2C8'
  },
  {
    id: 3,
    name: 'Maya Sari',
    initials: 'MS',
    rating: 5,
    text: 'Baru pertama kali pakai papan akrilik wisuda dan langsung suka banget! Fotonya bagus-bagus, adminnya ramah dan responsif. Worth every penny!',
    date: '28 Juni 2025',
    color: '#B8D4E8'
  },
  {
    id: 4,
    name: 'Rizky Amelia',
    initials: 'RA',
    rating: 5,
    text: 'Papan Blush Pink Floral pilihan yang tepat! Cocok banget sama tema wisuda kami yang feminin. Banyak teman tanya beli dimana, langsung ku rekomen ke sini!',
    date: '3 Juli 2025',
    color: '#FFD7B5'
  },
  {
    id: 5,
    name: 'Nabila Azzahra',
    initials: 'NA',
    rating: 5,
    text: 'Sistemnya sangat mudah dan praktis. Pesan lewat WA juga cepat dikonfirmasi. Papannya sangat cantik, foto wisuda jadi makin berkesan!',
    date: '5 Juli 2025',
    color: '#B5EAD7'
  },
  {
    id: 6,
    name: 'Lilis Suryani',
    initials: 'LS',
    rating: 5,
    text: 'Awalnya ragu karena sewa, tapi ternyata kualitasnya bagus banget! Akriliknya tebal, bunga dekorasinya cantik. Harga juga sangat terjangkau. Recommended!',
    date: '8 Juli 2025',
    color: '#FFDAC1'
  }
];

const StarRating = ({ rating }) => (
  <div className="star-rating">
    {[1, 2, 3, 4, 5].map(i => (
      <i key={i} className={`fa-star ${i <= rating ? 'fa-solid' : 'fa-regular'}`}></i>
    ))}
  </div>
);

const Testimonials = () => {
  return (
    <section className="testimonials-section">
      <div className="testimonials-header">
        <i className="fa-solid fa-quote-left testimonials-quote-icon"></i>
        <h2>Apa Kata Mereka?</h2>
        <p>Ribuan pelanggan puas mempercayakan momen wisuda mereka kepada kami</p>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t) => (
          <div key={t.id} className="testimonial-card">
            <div className="testimonial-top">
              <div className="testimonial-avatar" style={{ backgroundColor: t.color }}>
                {t.initials}
              </div>
              <div className="testimonial-meta">
                <strong className="testimonial-name">{t.name}</strong>
                <StarRating rating={t.rating} />
              </div>
            </div>
            <p className="testimonial-text">
              <i className="fa-solid fa-quote-left testimonial-inline-quote"></i>
              {t.text}
            </p>
            <span className="testimonial-date">
              <i className="fa-regular fa-calendar-check"></i> {t.date}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
