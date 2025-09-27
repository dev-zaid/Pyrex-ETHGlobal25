// import React from "react";
import phone1 from "./assets/phone1.png";

// Web Component: Choose your journey (Dark Theme Only)
// TailwindCSS recommended

// const Pill = ({ children }: { children: React.ReactNode }) => (
//   <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
//     {children}
//   </span>
// );

// const SectionCard: React.FC<{
//   children: React.ReactNode;
// }> = ({ children }) => (
//   <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
//     {children}
//   </div>
// );

export default function UserPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16">
      <main className="mx-auto grid max-w-5xl gap-6">
        <h2 className="mb-2 text-4xl font-bold text-center">
          Simplifying Everyday Forex
        </h2>
        <p className="mb-6 max-w-2xl text-white/70 text-center mx-auto">
          We make your forex payments feel like making payments in your
          homeland.
        </p>
      </main>
      <img src={phone1}></img>
    </div>
  );
}
