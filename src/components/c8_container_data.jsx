import React from "react";
import "./c8_container_data.css";
import Bazar from "../assets/bazar.svg";
import Button from "../components/button.jsx";
import { div } from "framer-motion/client";
function c8_container_data() {
  return (
    <div>
      <div className="c8parent">
        <div className="img_container">
          <img src={Bazar} alt="none" />
        </div>
        
          <div className="glass_container">
            <div className="c8data">
              <div className="c8heading">
                <strong>Pilgrim Bazaar</strong>
              </div>
              <div className="c8content">
                A soulful marketplace for spiritual, wellness, and
                heritage-inspired products
              </div>
              <div className="button">
                <Button btn_name={"Shope Now"} />
              </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default c8_container_data;
