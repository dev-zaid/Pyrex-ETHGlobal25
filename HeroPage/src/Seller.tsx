import React from "react";
import {
  FaWallet,
  FaHourglassHalf,
  FaExchangeAlt,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";

/**
 * A dark-themed, single-page React component describing the Secondary Agent (Seller's) Workflow.
 * This component is designed as a hero section, focusing on clear communication of the automated
 * trading process for stablecoins (PYUSD, USDT, USDC) to INR.
 */
const Seller = () => {
  const workflowSteps = [
    {
      icon: <FaWallet className="text-4xl text-green-400" />,
      title: "1. Seller Deploys Agent & Provides Liquidity",
      description:
        "The seller lists multiple stablecoins (e.g., PYUSD, USDT, USDC) for sale, committing the assets to the agent to provide **INR liquidity** for buyers.",
    },
    {
      icon: <FaHourglassHalf className="text-4xl text-amber-400" />,
      title: "2. Agent Waits for Requests",
      description:
        "The agent continuously monitors the central orderbook, specifically looking for incoming payment requests for **INR** from a Pyrex Agent.",
    },
    {
      icon: <FaChartLine className="text-4xl text-fuchsia-400" />,
      title: "3. Transfer the INR to the Merchant",
      description:
        "The Seller Agent transfers the requested INR to the merchants UPI. The response of this request is returned to the Pyrex Agent.",
    },
    {
      icon: <FaChartLine className="text-4xl text-fuchsia-400" />,
      title: "4. Settlement & Post-Transaction",
      description:
        "The Pyrex agent upon receiving the response from the Seller Agent, updates the orderbook and the status of the transaction. The transaction is settled, the agent receives the stablecoins, the INR payment is completed.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="text-center mb-16">
        <h1 className="text-3xl font-bold text-white mb-4 tracking-tight mt-20">
          Secondary Agent: Seller's Automated Workflow
        </h1>
      </header>

      {/* --- Key Features Section --- */}
      {/* <section className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-200 mb-8">Key Features</h2>
        <div className="flex justify-center space-x-8">
          <FeatureCard
            title="Liquidity Provider"
            detail="Always ready for INR-to-stablecoin conversions."
          />
          <FeatureCard
            title="Automatic Matching"
            detail="Seamless exchange with the Main Agent."
          />
          <FeatureCard
            title="Continuous Monitoring"
            detail="24/7 orderbook watch for incoming requests."
          />
        </div>
      </section> */}

      {/* --- Workflow Section --- */}
      <section className="max-w-7xl mx-auto">
        <div className="space-y-12">
          {workflowSteps.map((step, index) => (
            <WorkflowStep
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              isRight={index % 2 !== 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

/** Card for displaying key features. */
// const FeatureCard = ({ title, detail }: { title: string; detail: string }) => (
//   <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-64 transform transition duration-500 hover:scale-[1.03] hover:shadow-2xl border border-gray-700">
//     <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
//     <p className="text-gray-400">{detail}</p>
//   </div>
// );

/** Component for a single step in the workflow timeline. */
const WorkflowStep = ({
  icon,
  title,
  description,
  isRight,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isRight: boolean;
}) => (
  <div
    className={`flex items-center w-full ${
      isRight ? "" : "md:flex-row-reverse"
    }`}
  >
    {/* Line and Connector (Hidden on Small Screens for Simplicity) */}
    <div
      className={`hidden md:flex w-1/2 ${
        isRight ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`h-2 w-3/4 bg-gray-700 ${
          isRight ? "rounded-l-lg" : "rounded-r-lg"
        }`}
      ></div>
    </div>

    {/* Step Card */}
    <div
      className={`w-full md:w-1/2 flex ${
        isRight ? "justify-end md:pl-6" : "justify-start md:pr-6"
      }`}
    >
      <div
        className={`p-6 bg-gray-800 rounded-xl shadow-xl transform transition duration-300 hover:bg-gray-700 w-full border-t-4 ${
          isRight
            ? "border-r-4 border-fuchsia-500 hover:translate-x-2"
            : "border-l-4 border-green-500 hover:-translate-x-2"
        } border-opacity-70`}
      >
        <div className="flex items-center mb-4">
          {icon}
          <h4 className="text-2xl font-bold ml-4 text-white">{title}</h4>
        </div>
        <p
          className="text-gray-300"
          // This will find text wrapped in ** and make it bold.
          dangerouslySetInnerHTML={{
            __html: description.replace(
              /\*\*(.*?)\*\*/g,
              '<strong class="font-semibold text-gray-200">$1</strong>'
            ),
          }}
        />
      </div>
    </div>
  </div>
);

export default Seller;
