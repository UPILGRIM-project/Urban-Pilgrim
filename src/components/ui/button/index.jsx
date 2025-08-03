import React from 'react'
import "./button.css";
function button({ btn_name, className }) {
  return (
    <div >
      <div className={`btn_parent ${className}`}>
        <div className="btn_name ">
          {btn_name}
        </div>
      </div>
    </div>


  )
}

export default button
