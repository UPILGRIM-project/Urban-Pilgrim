import React from 'react'
import "./button.css";
function button({btn_name}) {
  return (
    <div >
<div className="btn_parent">
        <div className="btn_name">
            {btn_name}
        </div>
      </div>
    </div>
      
    
  )
}

export default button
