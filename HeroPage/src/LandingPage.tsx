import Navbar from "./Navbar";
import { Hero } from "./Hero";
import UserPage from "./UserPage";
import { TimelinePage } from "./Timeline";
import Seller from "./Seller";
import { Future } from "./Future";
import Footer from "./Footer";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <UserPage />
      <TimelinePage />
      <Seller />
      <Future />
      <Footer />
    </>
  );
}
