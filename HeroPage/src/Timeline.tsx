import { Timeline } from "./components/ui/timeline";
import qr from "./assets/QRImage_2.png";

export function TimelinePage() {
  const data = [
    {
      title: "The User",
      content: (
        <div>
          {/* <p className="mb-8 text-xs font-normal text-neutral-800 md:text-sm dark:text-neutral-200">
            Timeline
          </p> */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src={qr}
              alt="Startup Template"
              //   width={700}
              //   height={1000}
              className="w-full rounded-lg object-cover md:h-96 lg:h-96 bg-transparent"
            />
            <div className="text-white text-xl font-semibold text-center">
              User pays via PayPal (USD) → converted to PYUSD for efficient
              cross-border payment.
            </div>
          </div>
        </div>
      ),
    },
    // {
    //   title: "The Seller",
    //   content: (
    //     <div>
    //       <div className="grid grid-cols-2 gap-4 items-center">
    //         <img
    //           src="https://assets.aceternity.com/pro/hero-sections.png"
    //           alt="hero template"
    //           width={500}
    //           height={500}
    //           className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
    //         />
    //         <div className="text-white text-xl font-semibold text-center">
    //           Seller lists liquidity in orderbook (INR) → AI agent matches
    //           optimal exchange route.
    //         </div>
    //       </div>
    //     </div>
    //   ),
    // },
    {
      title: "The Agent",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://assets.aceternity.com/cards.png"
              alt="cards template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <div className="mb-8 mt-10">
              <div className="text-white text-xl font-semibold text-center">
                Pyrex agent finds the best exchange route
                (stablecoin-to-stablecoin or multi-step conversion).
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The Settlement",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src="https://assets.aceternity.com/pro/hero-sections.png"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <div className="text-white text-xl font-semibold text-center">
              Pyrex agent executes transaction, ensuring vendor receives INR and
              user’s payment is processed efficiently.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The Features",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src="https://assets.aceternity.com/pro/hero-sections.png"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <div className="text-white text-xl font-semibold text-center">
              Supports PYUSD, USDC, USDT for flexible transactions. <br />
              Transparent, secure, and traceable payments.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The Security",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src="https://assets.aceternity.com/pro/hero-sections.png"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <div className="text-white text-xl font-semibold text-center">
              Secure user identity and liquidity reservation via SELF Protocol
              ensures fair trading.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The Business",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src="https://assets.aceternity.com/pro/hero-sections.png"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <div className="text-white text-xl font-semibold text-center">
              Transaction fees (0.5%-1%), premium vendor accounts.
            </div>
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="relative w-full overflow-clip">
      <Timeline data={data} />
    </div>
  );
}
