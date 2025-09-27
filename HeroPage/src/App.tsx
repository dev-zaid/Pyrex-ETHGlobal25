import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { ProcessingPage } from "./ProcessingPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
