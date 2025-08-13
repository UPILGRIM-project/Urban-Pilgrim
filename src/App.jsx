import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/navbar/NavBar";
import Loader from "./components/Loader";
import Home from "./pages/home";
import Retreats from "./pages/pilgrim_retreats/Retreats";
import Sessions from "./pages/pilgrim_sessions/Sessions";
import Guides from "./pages/pilgrim_guides/Guides";
import JoinGuides from "./pages/join_us_as_guides/JoinGuides";
import JoinAdvisors from "./pages/join_us_as_trip_advisors/JoinAdvisors";
import ContactForm from "./pages/contact/Contact";
import Footer from "./components/footer";
import WhyUs from "./pages/whychooseUs/WhyChoseUs";
import CartPage from "./pages/cart/CartPage";
import WhoAreWe from "./pages/whoarewe/WhoAreWe";
import SessionSlots from "./pages/session_slots/SessionSlots";
import SessionDescription from "./pages/session_slots/SessionDescription";
import GuideClassDetails from "./components/pilgrim_guides/GuideClassDetails";
import Retreatdescription from "./components/pilgrim_retreats/Retreatdescription";
import Admin from "./pages/admin/Admin";
import ProgramDetails from "./pages/program_details/ProgramDetails";
import UserDashboard from "./components/UserDashboard";

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isAdminRoute = location.pathname === "/admin" || location.pathname === "/userdashboard";

  return (
    <div className="relative">
      {/* Loader overlay */}
      {loading && <Loader onFinish={() => setLoading(false)} />}
      {loading && isAdminRoute && <div className="hidden">{setLoading(false)}</div>}

      {/* Only show navbar & routes once loader is done */}
      {!loading && (
        <>
          {!isAdminRoute && <NavBar />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pilgrim_retreats" element={<Retreats />} />
            <Route path="/pilgrim_sessions" element={<Sessions />} />
            <Route path="/pilgrim_guides" element={<Guides />} />
            <Route path="/contact" element={<ContactForm />} />
            <Route path="/joinusguides" element={<JoinGuides />} />
            <Route path="/joinusadvisors" element={<JoinAdvisors />} />
            <Route path="/whyus" element={<WhyUs />} />
            <Route path="/whoarewe" element={<WhoAreWe />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/session/:sessionId/slots" element={<SessionSlots />} />
            <Route path="/program/:programId/details" element={<ProgramDetails />} />
            <Route path="/session/:sessionId/slots/description" element={<SessionDescription />} />
            <Route path="/guide/:guideClassName" element={<GuideClassDetails />} />
            <Route path="/pilgrim_retreats/:retreatName" element={<Retreatdescription />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Home replace={'/'} />} />
             <Route path="/userdashboard" element={<UserDashboard />} />
          </Routes>
          {!isAdminRoute && <Footer className="mt-10" />}
        </>
      )}
    </div>
  );
}

export default App;
