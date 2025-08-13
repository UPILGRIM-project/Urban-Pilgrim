import { useState } from "react";

export default function Sidebar({ activeSection, setActiveSection }) {
  const [isOpen, setIsOpen] = useState(false);

  const menu = [
    { name: "Home Page", key: "home" },
    { name: "Pilgrim retreats", key: "retreats" },
    { name: "Pilgrim sessions", key: "sessions" },
    { name: "Pilgrim Guides", key: "guides" },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuClick = (key) => {
    setActiveSection(key);
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="md:hidden relative h-10 w-10 z-50 p-2 m-4 bg-[#0c3c60] text-white rounded-lg shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`md:w-64 w-full  h-screen bg-[#fff] p-5 border-r border-black/20 fixed z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="space-y-3 mt-[100px] md:mt-[100px]">
          {menu.map(({ name, key }) => (
            <button
              key={key}
              onClick={() => handleMenuClick(key)}
              className={`flex items-center gap-3 p-3 rounded-full w-full text-left
                ${activeSection === key ? "bg-[#fceee3] text-[#0c3c60]" : "text-gray-600"}
                hover:bg-[#fceee3]`}
            >
              <img src={`/assets/admin/${key}.svg`} alt={`${name} icon`} className="w-6 h-6" />
              {name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
