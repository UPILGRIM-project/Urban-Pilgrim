import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./NavBar.css";
import logo from "../assets/urban_pilgrim_logo.png";


const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logo} alt="Urban Pilgrim" />
      </div>

      <div className={`nav-links ${isOpen ? "open" : ""}`}>
        <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
        <Link to="/Pilgrim_Experiences" onClick={() => setIsOpen(false)}>Pilgrim Experiences</Link>
        <Link to="/Pilgrim_Sessions" onClick={() => setIsOpen(false)}>Pilgrim Sessions</Link>
        <Link to="/Wellness_Program" onClick={() => setIsOpen(false)}>Wellness Program</Link>
        <Link to="/Wellness_Guide" onClick={() => setIsOpen(false)}>Wellness Guide</Link>
        <Link to="/contact" onClick={() => setIsOpen(false)}>Contact</Link>
      </div>

      <div className="menu-icon" onClick={toggleMenu}>
        {isOpen ? '✖' : '☰'}
      </div>

      
    </nav>
  );
};

export default NavBar;
