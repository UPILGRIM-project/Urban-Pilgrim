export default function CategorySelector() {
  return (
    <div className="bg-white rounded-xl shadow px-6 py-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center items-start mb-2">
        <span className="font-semibold text-gray-700 mb-4 sm:mb-0 sm:mr-2">
          Category:
        </span>

        {/* Mobile Dropdown */}
        <select className="block sm:hidden border border-gray-300 rounded px-3 py-1 text-sm w-full">
          <option value="all">All</option>
          <option value="yoga">Yoga</option>
          <option value="meditation">Meditation</option>
        </select>

        {/* Scrollable Buttons on Desktop */}
        <div className="hidden sm:flex space-x-4 overflow-x-auto">
          <button className="bg-white px-4 py-1 rounded-full md:text-sm text-xs whitespace-nowrap">
            All
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full md:text-sm text-xs whitespace-nowrap">
            Yoga
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full md:text-sm text-xs whitespace-nowrap">
            Meditation
          </button>
        </div>
      </div>
    </div>
  );
}
