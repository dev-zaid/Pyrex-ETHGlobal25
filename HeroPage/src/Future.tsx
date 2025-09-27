import { cn } from "./lib/utils";
import {
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function Future() {
  const features = [
    {
      title: "Rewards",
      description:
        "Earn loyalty points or tokens on each transaction, redeem them for discounts, lower fees, or other benefits.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Wide Currencies",
      description:
        "Will support additional local and digital currencies, providing users and vendors with a broader range of payment options anywhere.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Cashbacks",
      description:
        "High-value transactions receive a percentage cashback, incentivizing larger payments and increasing overall transaction volume on the platform.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Referrals",
      description:
        "Referral program where users can earn rewards for inviting new users or vendors.",
      icon: <IconCloud />,
    },
    {
      title: "Subscriptions",
      description:
        "Users can subscribe at a minimal cost for some premium features",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Merchant Integrations",
      description:
        "Allow merchants to integrate the payment system into their websites or apps, enabling them to accept payments directly in multiple currencies via stablecoins.",
      icon: <IconHelp />,
    },
  ];
  return (
    <div className="w-full bg-black text-white py-16">
      <div className="text-4xl text-white text-center my-20 font-bold">
        Speculated Features
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative z-10 gap-0 px-6 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l border-neutral-800",
        index < 4 && "lg:border-b border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-900/80 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-900/80 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-300">{icon}</div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
