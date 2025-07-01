import React from "react";
import "./footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-logo">Urban Pilgrim</div>

        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#wellness">Wellness</a>
          <a href="#experiences">Experiences</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-social">
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} Urban Pilgrim. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
