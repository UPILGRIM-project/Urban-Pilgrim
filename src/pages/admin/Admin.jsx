import { useState } from "react";
import Sidebar from "./SideBar";
import Home from "./Home";
import Retreats from "./Retreats";
import Sessions from "./Sessions";
import Guides from "./Guides";

export default function Admin() {
  const [activeSection, setActiveSection] = useState("home");

  const renderSection = () => {
    switch (activeSection) {
      case "retreats":
        return <Retreats />;
      case "sessions":
        return <Sessions />;
      case "guides":
        return <Guides />;
      case "home":
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 ml-[250px] bg-gray-50">{renderSection()}</div>
    </div>
  );
}
