import { useState } from "react";
import { FaChevronDown } from "react-icons/fa"; // Using react-icons for the chevron

/**
 * A reusable Accordion component with animation for expanding/collapsing content.
 * It includes an example FAQ section.
 */
const FAQ = () => {
  const faqData = [
    {
      question:
        "What makes your on-chain forex solution more efficient compared to traditional forex cards and cross-border payment methods?",
      answer:
        "Unlike traditional forex cards, which rely on banks and intermediaries, our on-chain solution leverages blockchain technology and stablecoins for faster, more transparent, and low-cost cross-border transactions. By using AI agents to match liquidity providers and optimize exchange rates, users can benefit from quicker transactions with minimal slippage.",
    },
    {
      question:
        "How does your AI agent determine the best exchange route for users and vendors?",
      answer:
        "The AI agent considers various factors such as current exchange rates, available liquidity, and slippage to determine the most cost-effective and efficient route for each transaction. It can choose a direct stablecoin-to-INR exchange or a multi-step conversion (e.g., PYUSD → USDC → INR) depending on which option provides the best outcome in terms of cost and speed.",
    },
    {
      question:
        "What makes your platform's integration with PayPal unique compared to other cross-border payment solutions?",
      answer:
        "Our PayPal integration allows users to seamlessly pay in USD or their local currency without needing to manage cryptocurrency or stablecoin wallets. The platform automatically converts the PayPal payment into PYUSD (or other stablecoins) for cross-border transactions, simplifying the process for users unfamiliar with cryptocurrencies.",
    },
    {
      question:
        "What sets your platform apart from other crypto-to-fiat payment solutions?",
      answer:
        "Unlike traditional crypto-to-fiat payment solutions, which often rely on complex wallets and exchanges, our platform is designed to provide a seamless user experience by using PayPal for payments, stablecoins for conversion, and AI-driven agents for efficient transaction matching. The platform’s use of stablecoins ensures minimal volatility, while AI enhances the speed and accuracy of the entire process.",
    },
    {
      question: "How can we make profits?",
      answer:
        "We will generate profits through transaction fees (charged on each cross-border payment), premium vendor subscriptions for enhanced features, and commissions from liquidity providers. Additionally, businesses can pay for cross-border payroll and vendor payments, while third-party developers can access our API or white-label solutions for a fee. We’ll also offer advanced analytics and market insights on a subscription basis, incentivize growth with a referral program, and potentially explore staking or tokenized incentives in the future to further drive engagement and profitability.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8 ">
      <h2 className="text-4xl font-bold text-center mb-12 text-white mt-30">
        Frequently Asked Questions
      </h2>
      <div className="w-full mx-auto space-y-4">
        {faqData.map((faq, index) => (
          <AccordionItem
            key={index}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Accordion Item component.
 * Manages its own open/close state.
 */
const AccordionItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className=" overflow-hidden bg-black">
      <button
        className="flex justify-between items-center w-full p-5 text-lg font-semibold text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-black transition-colors duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        <FaChevronDown
          className={`transform transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? "max-h-screen opacity-100 p-5" : "max-h-0 opacity-0 px-5"
        }`}
        style={{
          maxHeight: isOpen ? "500px" : "0px",
          paddingTop: isOpen ? "1.25rem" : "0",
          paddingBottom: isOpen ? "1.25rem" : "0",
        }}
      >
        <p className="text-gray-300">{answer}</p>
      </div>
    </div>
  );
};

export default FAQ;
