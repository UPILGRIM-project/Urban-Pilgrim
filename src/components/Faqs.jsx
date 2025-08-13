import { useState } from 'react';
import { motion } from 'framer-motion';

function Faqs () {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "What to Expect?",
      answer:
        "All courses purchased on SkillLoop are non-refundable. Please review the course content and structure carefully before purchasing.",
    },
    {
      id: 2,
      question: "What's included in the package?",
      answer:
        "No, SkillLoop follows a tiered purchase model. Each level (Basic, Intermediate, Advanced) must be purchased separately.",
    },
    {
      id: 3,
      question: "What's not included in the package?",
      answer:
        "Yes! Every learner receives a completion certificate for each level they complete — Basic, Intermediate, and Advanced.",
    }
  ];


  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <section id='faq'>
      <div className="max-w-7xl mx-auto">

        {/* FAQ Items */}
        <motion.div 
          initial={{ opacity: 0, x: 0, y: -100 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-[#FFFFFF99] rounded-md border-b border-[#D9E8EE] overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full py-4 text-left transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 pr-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 aspect-square rounded-full bg-[#004B6E] text-white text-sm font-bold whitespace-nowrap">
                      {faq.id}
                    </span>
                    {faq.question}
                  </p>

                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300">
                      {openFaq === faq.id ? (
                        // X Icon
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        // Plus Icon
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Answer */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  openFaq === faq.id
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Faqs;
