import React from "react";
import Program from "../components/ProgramExplorer.jsx";
import Step from "../components/StepWizard.jsx";
function Pilgrim_Bazaar() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Pilgrim_Bazaar</h1>
       <div ><Step/></div>
      <div className="div"><Program/></div>
     
    </div>
  );
}

export default Pilgrim_Bazaar;
