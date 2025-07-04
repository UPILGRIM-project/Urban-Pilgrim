import React from "react";
import "./footer.css";
import Button from "../components/button.jsx";
import Input_field from "../components/inputfield.jsx";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-tagline">
          Be the first to explore new practices and hidden paths to inner peace.
        </div>

        <div className="footer-subscribe">
          <Input_field Type={"email"} Hint={"E-mail address"} />
          <Button btn_name={"Subscribe"} />
        </div>
      </div>

      <div className="footer-links">
        <h3>Quick Links</h3>
        <div className="links-grid">
          <div>
            <a href="#">Join us as guides</a>
            <a href="#">Join us as Trip Curators</a>
          </div>
          <div>
            <a href="#">Who we are</a>
            <a href="#">Why choose us</a>
          </div>
          <div>
            <a href="#">Privacy Policy</a>
            <a href="#">Blogs</a>
          </div>
          <div>
            <a href="#">Contact us</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} Urban Pilgrim. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
