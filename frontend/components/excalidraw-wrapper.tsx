"use client";
import { Excalidraw } from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";

type props=
{
  getChanges:(elements:any)=>void,
  setAPI:(api:any)=>void,
  viewModeEnabled:boolean
}

const ExcalidrawWrapper = ({getChanges,setAPI,viewModeEnabled}:props) => {

  const handleChange=(elements:any)=>
  {
    getChanges(elements)
  }

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw onChange={handleChange} excalidrawAPI={(api)=>{setAPI(api)}} viewModeEnabled={viewModeEnabled}/>
    </div>
  );
};
export default ExcalidrawWrapper;