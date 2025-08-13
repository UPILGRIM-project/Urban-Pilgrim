import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./NavBar.css";
import { CiSearch } from "react-icons/ci";
import { FaRegUser } from "react-icons/fa";
import { FiShoppingCart } from "react-icons/fi";
import SignIn from "../SignIn";
import SearchBar from "../SearchBar";

const NavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showSignIn, setShowSignIn] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);
    const toggleSearch = () => setShowSearch(true);
    const toggleSignIn = () => setShowSignIn(!showSignIn);

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <img className="logo " src="https://www.urbanpilgrim.in/cdn/shop/files/logo.jpg?v=1744941617&width=600" alt="Urban Pilgrim" />
            </div>

            <motion.div
                className={`nav-links ${isOpen ? "open" : ""}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
                <Link to="/pilgrim_retreats" onClick={() => setIsOpen(false)}>Pilgrim Retreats</Link>
                <Link to="/pilgrim_sessions" onClick={() => setIsOpen(false)}>Pilgrim Sessions</Link>
                <Link to="/pilgrim_guides" onClick={() => setIsOpen(false)}>Pilgrim Guides</Link>
                <Link to="/contact" onClick={() => setIsOpen(false)}>Contact</Link>
            </motion.div>

            <div className="navbar-right">
                <CiSearch
                    className="search-icon "
                    onClick={toggleSearch}
                />
                <FaRegUser
                    className="user-icon"
                    onClick={toggleSignIn}
                />
                <FiShoppingCart
                    className="user-icon"
                    onClick={() => window.location.href = "/cart"}
                />
                <motion.div
                    className="menu-icon"
                    onClick={toggleMenu}
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {isOpen ? '✖' : '☰'}
                </motion.div>
            </div>

            <AnimatePresence>
                {showSearch && (
                    <SearchBar onClose={() => setShowSearch(false)} />
                )}
            </AnimatePresence>

            {showSignIn && (
                <SignIn onClose={() => setShowSignIn(false)} />
            )}
        </nav>
    );
};

export default NavBar;
