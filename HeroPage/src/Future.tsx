import { cn } from "./lib/utils";
import type { ReactNode } from "react";
import {
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

type FutureProps = {
  showHeading?: boolean;
  className?: string;
};

export function Future({ showHeading = true, className }: FutureProps) {
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
    <div className={cn("w-full bg-black text-white py-16", className)}>
      {showHeading && (
        <div className="my-20 text-center text-4xl font-bold text-white">
          Speculated Features
        </div>
      )}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </div>
  );
}

type FeatureProps = {
  title: string;
  description: string;
  icon: ReactNode;
  index: number;
};

const Feature = ({ title, description, icon, index }: FeatureProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col py-10 group/feature border-neutral-800 lg:border-r",
        (index === 0 || index === 3) && "lg:border-l",
        index < 3 && "lg:border-b"
      )}
    >
      {index < 3 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-900/80 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100" />
      )}
      {index >= 3 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-900/80 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100" />
      )}
      <div className="relative z-10 mb-4 px-10 text-neutral-300">{icon}</div>
      <div className="relative z-10 mb-2 px-10 text-lg font-bold">
        <div className="absolute inset-y-0 left-0 w-1 origin-center rounded-tr-full rounded-br-full bg-neutral-700 transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-blue-500" />
        <span className="inline-block text-white transition duration-200 group-hover/feature:translate-x-2">
          {title}
        </span>
      </div>
      <p className="relative z-10 max-w-xs px-10 text-sm text-neutral-300">
        {description}
      </p>
    </div>
  );
};
