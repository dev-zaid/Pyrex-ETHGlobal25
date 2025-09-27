// import { useState } from "react";
import "./App.css";
import Navbar from "./Navbar";
import { Hero } from "./Hero";
import UserPage from "./UserPage";
// import UpiPage from "./UpiPage";
import { TimelinePage } from "./Timeline";
import Seller from "./Seller";
// import FAQ from "./FAQ";
import { Future } from "./Future";
import Footer from "./Footer";

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <UserPage />
      <TimelinePage />
      {/* <UpiPage /> */}
      <Seller />
      {/* <FAQ /> */}
      <Future />
      <Footer />
    </>
  );
}

export default App;
