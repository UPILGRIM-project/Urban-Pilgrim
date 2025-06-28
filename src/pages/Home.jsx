import React from "react";
import homepage_img from "../assets/home_page_img.png";
import "./Home.css";
function Home() {
  return (
    <div class="hero-section">
  <img src={homepage_img} alt="Banner" />
    <div class="overlap-box">
      <h2>Left Content</h2>
      <p>This is on the left bottom over the image.</p>
    </div>
</div>

  );
}

export default Home;
