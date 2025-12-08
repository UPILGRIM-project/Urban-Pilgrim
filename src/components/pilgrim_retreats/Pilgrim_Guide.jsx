const PilgrimGuide = ({ guides }) => {
  return (
    <>
      <style>{`
        .guide-content ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }
        .guide-content ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }
        .guide-content li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          display: list-item;
        }
      `}</style>
      <section className="bg-[#1F4B6E] text-white px-6 py-12 w-screen">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-10 md:items-start items-center">
          <img
            src={guides?.image}
            alt="Pilgrim Guide"
            className="w-full aspect-[3/4] md:w-2/7 md:h-full md:max-h-none max-h-90 rounded-lg shadow-lg object-cover"
          />

          <div className="text-sm leading-relaxed">
            <h2 className="text-white text-xl font-semibold mb-4">
              {guides?.title}
            </h2>

            <div
              className="mb-2 guide-content"
              dangerouslySetInnerHTML={{ __html: guides?.description || "" }}
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default PilgrimGuide;
