// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Load Google Fonts
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

// Global styles
const style = document.createElement("style");
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Nunito', 'Segoe UI', sans-serif; }
  input::placeholder { color: rgba(255,255,255,0.3); }
  textarea::placeholder { color: rgba(255,255,255,0.3); }
  input:focus, textarea:focus, select:focus {
    border-color: rgba(148,216,240,0.5) !important;
    box-shadow: 0 0 0 3px rgba(148,216,240,0.1);
  }
  button:hover { opacity: 0.9; transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(211,47,47,0.4); } 50% { box-shadow: 0 0 0 12px rgba(211,47,47,0); } }
  #qr-reader { background: transparent !important; }
  #qr-reader video { border-radius: 12px; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);
