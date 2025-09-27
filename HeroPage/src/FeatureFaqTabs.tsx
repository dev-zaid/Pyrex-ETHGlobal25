import { useState } from "react";
import { Future } from "./Future";
import FAQ from "./FAQ";

const FeatureFaqTabs = () => {
  const [activeTab, setActiveTab] = useState<"features" | "faq">("features");

  return (
    <section className="bg-black py-16 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-center gap-6 text-lg font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`transition-colors hover:text-white ${
              activeTab === "features" ? "text-white" : "text-white/50"
            }`}
          >
            Speculated Features
          </button>
          <span className="text-white/40">|</span>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`transition-colors hover:text-white ${
              activeTab === "faq" ? "text-white" : "text-white/50"
            }`}
          >
            FAQs
          </button>
        </div>

        <div className="mt-12">
          {activeTab === "features" ? (
            <Future showHeading={false} className="bg-transparent py-0" />
          ) : (
            <FAQ showHeading={false} className="min-h-0 bg-transparent px-0 py-0" />
          )}
        </div>
      </div>
    </section>
  );
};

export default FeatureFaqTabs;
