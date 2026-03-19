import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import NavBar from "./components/navbar/NavBar";
import Loader from "./components/Loader";
import Home from "./pages/home";
import Retreats from "./pages/pilgrim_retreats/Retreats";
import Sessions from "./pages/pilgrim_sessions/Sessions";
import Guides from "./pages/pilgrim_guides/Guides";
import GiftCards from "./pages/gift_cards/GiftCards";
import UpcomingEvents from "./pages/upcoming_events/UpcomingEvents";
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
import GiftCardDetails from "./components/gift_card/GiftCardDetails";
import Admin from "./pages/admin/Admin";
import AdminGiftCards from "./pages/admin/GiftCards";
import ProgramDetails from "./pages/program_details/ProgramDetails";
import UserDashboardRoute from "./components/UserDashboardRoute";
import PrivacyPolicy from "./pages/privacy_policy/PrivacyPolicy";
import YogaDesc from "./components/YogaDesc";
import EventDetails from "./components/upcoming_events/EventDetails";
import LiveDetails from "./pages/program_details/LiveDeatils";
import WorkshopDetails from "./components/pilgrim_workshop/WorkshopDetails";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton.jsx";
import Organizer from "./pages/organizer/Organizer.jsx";
import OrganizerUsers from "./pages/organizer/Users.jsx";
import BulkWhatsAppSender from "./components/admin/BulkWhatsAppSender.jsx";
import { trackEvent } from "./utils/metaPixel";

function App() {

    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const isAdminRoute = location.pathname === "/admin" ||
        location.pathname === "/userdashboard" ||
        location.pathname === "/organizer" ||
        location.pathname === "/organizer/users" ||
        location.pathname.startsWith("/admin/");

    // Decide whether to show loader only on the very first visit
    useEffect(() => {
        try {
            const seen = localStorage.getItem('hasSeenLoader') === 'true';
            if (seen || isAdminRoute) {
                setLoading(false);
            } else {
                setLoading(true);
            }
        } catch {
            // Fallback: if storage fails, default to showing once
            if (isAdminRoute) setLoading(false);
        }
    }, [isAdminRoute]);


    return (
        <CartProvider>
            <div className="relative">
                {/* Loader overlay */}
                {loading && !isAdminRoute && (
                    <Loader
                        onFinish={() => {
                            try { localStorage.setItem('hasSeenLoader', 'true'); } catch { }
                            setLoading(false);
                        }}
                    />
                )}

                {/* Only show navbar & routes once loader is done */}
                {!loading && (
                    <>
                        {!isAdminRoute && <NavBar />}
                        {!isAdminRoute && <WhatsAppFloatingButton />}
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/pilgrim_retreats" element={<Retreats />} />
                            <Route path="/pilgrim_sessions" element={<Sessions />} />
                            <Route path="/pilgrim_guides" element={<Guides />} />
                            <Route path="/gift-cards" element={<GiftCards />} />
                            <Route path="/upcoming_events" element={<UpcomingEvents />} />
                            <Route path="/contact" element={<ContactForm />} />
                            <Route path="/joinusguides" element={<JoinGuides />} />
                            <Route path="/joinusadvisors" element={<JoinAdvisors />} />
                            <Route path="/whyus" element={<WhyUs />} />
                            <Route path="/whoarewe" element={<WhoAreWe />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/yoga/:title" element={<YogaDesc />} />
                            <Route path="/cart" element={<CartPage />} />
                            {/* live session */}
                            <Route path="/session/:sessionId/details" element={<LiveDetails />} />
                            <Route path="/session/:sessionId/slots" element={<SessionSlots />} />
                            {/* recorded program */}
                            <Route path="/program/:programId/details" element={<ProgramDetails />} />
                            <Route path="/program/:programId/slots" element={<SessionDescription />} />
                            {/* guide */}
                            <Route path="/guide/:guideClassName" element={<GuideClassDetails />} />
                            {/* retreat */}
                            <Route path="/pilgrim_retreats/:retreatName" element={<Retreatdescription />} />
                            {/* gift card */}
                            <Route path="/gift-card/:id" element={<GiftCardDetails />} />
                            {/* workshop */}
                            <Route path="/workshop/:title/details" element={<WorkshopDetails />} />
                            {/* event */}
                            <Route path="/event/:eventName" element={<EventDetails />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/admin/giftcards" element={<AdminGiftCards />} />
                            <Route path="/admin/whatsapp" element={<BulkWhatsAppSender />} />
                            <Route path="/userdashboard" element={<UserDashboardRoute />} />
                            <Route path="/organizer" element={<Organizer />} />
                            <Route path="/organizer/users" element={<OrganizerUsers />} />
                            <Route path="*" element={<Home replace={'/'} />} />
                        </Routes>
                        {!isAdminRoute && <Footer className="mt-10" />}
                    </>
                )}
            </div>
        </CartProvider>
    );
}

export default App;
