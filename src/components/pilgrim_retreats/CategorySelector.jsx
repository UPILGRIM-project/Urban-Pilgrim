export default function CategorySelector() {
  return (
    <div className="bg-white rounded-xl shadow px-6 py-4 mb-2">
      <div className="flex flex-col md:flex-row md:items-center items-start mb-2">
        <span className="font-semibold text-gray-700 mb-4 md:mb-0 sm:mr-2 mr-0">Category:</span>

        {/* Mobile Dropdown */}
        <select className="block sm:hidden border border-gray-300 rounded px-3 py-1 text-sm w-full">
          <option value="cultural">Cultural and Heritage immersion</option>
          <option value="spiritual">Spiritual and wellness immersion</option>
        </select>

        {/* Desktop Scrollable Buttons */}
        <div className="hidden sm:flex space-x-4 overflow-x-auto">
          <button className="bg-black text-white px-4 py-1 rounded-full text-sm whitespace-nowrap">
            Cultural and Heritage immersion
          </button>
          <button className="bg-white border border-gray-300 text-black px-4 py-1 rounded-full text-sm whitespace-nowrap">
            Spiritual and wellness immersion
          </button>
        </div>
      </div>
    </div>
  );
}
