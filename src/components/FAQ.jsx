import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = ({ faqs = [] }) => {
  const [openId, setOpenId] = useState(null);

  const toggleFaq = (id) => {
    setOpenId(openId === id ? null : id);
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="faq-section animate-fade-in">
      <div className="faq-container">
        <div className="faq-header">
          <h2>Pertanyaan yang Sering Diajukan</h2>
          <p>Temukan jawaban untuk pertanyaan umum seputar penyewaan</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown className="faq-icon" size={20} />
                </button>
                <div className="faq-answer-wrapper">
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
