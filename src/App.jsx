import React from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Pilgrim_Bazaar from "./pages/Pilgrim_Bazaar";
import Pilgrim_Experiences from "./pages/Pilgrim_Experiences";
import Pilgrim_Sessions from "./pages/Pilgrim_Sessions";
import Wellness_Guide from "./pages/Wellness_Guide";
import Wellness_Program from "./pages/Wellness_Program";

import Contact from "./pages/Contact";

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Pilgrim_Bazaar" element={<Pilgrim_Bazaar />} />
        <Route path="/Pilgrim_Sessions" element={<Pilgrim_Sessions />} />
        <Route path="/Pilgrim_Experiences" element={<Pilgrim_Experiences />} />
        <Route path="/Wellness_Guide" element={<Wellness_Guide />} />
        <Route path="/Wellness_Program" element={<Wellness_Program />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </div>
  );
}

export default App;
