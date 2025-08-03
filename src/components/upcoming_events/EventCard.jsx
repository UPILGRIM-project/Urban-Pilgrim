export default function EventCard({ data }) {
  return (
    <div className="max-w-sm rounded-2xl overflow-hidden bg-gradient-to-b from-[#FDF6F2] to-[#FCEFE6]" style={{
        boxShadow: "-21px 21px 25.7px 0 rgba(0, 0, 0, 0.25)"
    }}>
      <img
        src={data.image}
        alt={data.title}
        className="w-full h-60 aspect-square object-cover rounded-t-xl"
      />

      <div className="space-y-2 p-4 bg-[url('/assets/eventbg.svg')] bg-cover bg-bottom rounded-b-2xl">
        <div className="flex gap-2 flex-wrap">
          {data.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-[#F6E5D8] text-[#A27056] text-sm font-medium px-3 py-1 mb-4 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-[#1A1A1A]">
          {data.title}
        </h3>

        <p className="text-gray-500 text-sm">
          From <span className="text-black font-semibold">Rs. {data.price}</span>
        </p>
      </div>
    </div>
  );
}
