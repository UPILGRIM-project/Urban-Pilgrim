export default function CategorySelector() {
  return (
    <div className="bg-white rounded-xl shadow px-6 py-4 mb-2">
      <div className="flex flex-col md:flex-row md:items-center items-start mb-2">
        <span className="font-semibold text-gray-700 mb-4 md:mb-0 sm:mr-2 mr-0">
          Category:
        </span>

        {/* Mobile Dropdown */}
        <select className="block sm:hidden border border-gray-300 rounded px-3 py-1 text-sm w-full">
          <option value="all">All</option>
          <option value="yoga">Yoga Guides</option>
          <option value="meditation">Meditation Guides</option>
          <option value="mental">Mental Wellness</option>
          <option value="nutrition">Nutrition Experts</option>
          <option value="ritual">Ritual Pandits</option>
        </select>

        {/* Desktop Scrollable Buttons */}
        <div className="hidden sm:flex space-x-4 overflow-x-auto">
          <button className="bg-white px-4 py-1 rounded-full sm:text-sm text-xs">
            All
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full sm:text-sm text-xs whitespace-nowrap">
            Yoga Guides
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full sm:text-sm text-xs whitespace-nowrap">
            Meditation Guides
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full sm:text-sm text-xs whitespace-nowrap">
            Mental Wellness
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full sm:text-sm text-xs whitespace-nowrap">
            Nutrition Experts
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full sm:text-sm text-xs whitespace-nowrap">
            Ritual Pandits
          </button>
        </div>
      </div>
    </div>
  );
}
