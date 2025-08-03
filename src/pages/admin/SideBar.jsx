export default function Sidebar({ activeSection, setActiveSection }) {
  const menu = [
    { name: "Home Page", key: "home" },
    { name: "Pilgrim retreats", key: "retreats" },
    { name: "Pilgrim sessions", key: "sessions" },
    { name: "Pilgrim Guides", key: "guides" },
  ];

  return (
    <div className="w-64 h-screen bg-[#fff] p-5 border-r border-black/20 fixed">
      <div className="space-y-3 mt-[100px]">
        {menu.map(({ name, key }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
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
  );
}
