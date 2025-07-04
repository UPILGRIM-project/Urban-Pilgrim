import React, { useState } from "react";

function ArrowButton({ forceHovered = null }) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine final hover state
  const finalHovered = forceHovered !== null ? forceHovered : isHovered;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: finalHovered ? "#ffffff" : "transparent",
        border: "1px solid white",
        borderRadius: "50%",
        width: "30px",
        height: "30px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        overflow: "hidden",
        padding: "5px",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 16 16"
        fill={finalHovered ? "black" : "white"}
        style={{ transition: "fill 0.3s ease" }}
      >
        <path d="M4.5 7.5a.5.5 0 0 0 0 1h6l-2 2 .7.7 3-3-3-3-.7.7 2 2h-6z" />
      </svg>
    </div>
  );
}

export default ArrowButton;
