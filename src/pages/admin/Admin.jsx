import { useState } from "react";
import Sidebar from "./SideBar";
import Home from "./Home";
import Retreats from "./Retreats";
import Sessions from "./Sessions";
import Workshops from "./Workshops";
import Guides from "./Guides";
import Events from "./Events";
import Bundles from "./Bundles";
import Coupons from "./Coupons";
import Analysis from "./Analysis";
import Organizers from "./Organizers";
import UpcomingEvents from "../../components/admin/upcoming_events/UpcomingEvents";
import AdminProtectedRoute from "../../components/admin/AdminProtectedRoute";
import BulkWhatsAppSender from "../../components/admin/BulkWhatsAppSender";

export default function Admin() {
  const [activeSection, setActiveSection] = useState("home");

  const renderSection = () => {
    switch (activeSection) {
      case "retreats":
        return <Retreats />;
      case "sessions":
        return <Sessions />;
      case "workshops":
        return <Workshops />;
      case "guides":
        return <Guides />;
      case "events":
        return <Events />;
      case "bundles":
        return <Bundles />;
      case "organizer":
        return <Organizers />;
      case "coupons":
        return <Coupons />;
      case "analysis":
        return <Analysis />;
      case "whatsapp":
        return <BulkWhatsAppSender />;
      default:
        return <Home />;
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="flex md:flex-row flex-col min-h-screen bg-gray-50">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <div className="flex-1 ml-0 md:ml-[250px] md:mt-0">{renderSection()}</div>
      </div>
    </AdminProtectedRoute>
  );
}
