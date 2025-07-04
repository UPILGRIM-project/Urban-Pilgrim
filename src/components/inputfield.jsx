import React from 'react'
import "./inputfield.css"
function inputfield({Type,Hint}) {
  return (
    <div className="email-input">
      <span className="icon">✉️</span>
      <input type={Type} placeholder={Hint} />
    </div>
  )
}

export default inputfield
