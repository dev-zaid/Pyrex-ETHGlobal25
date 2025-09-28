import { Timeline } from "./components/ui/timeline";
import qr from "./assets/QRImage_2.png";
import verify from "./assets/verify-self.png";
import success from "./assets/successful-p.png";
import processing from "./assets/processing.png";
import pay from "./assets/pay.png";

export function TimelinePage() {
  const data = [
    {
      title: "Verify",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src={verify}
              alt="hero template"
              className="h-48 w-full max-w-full rounded-lg object-contain shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-60 lg:h-100"
            />
            <div className="text-white text-xl font-semibold text-center">
              User authenticates their identity by using their Passport and
              Aadhaar through Self Protocol.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Scan",
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
              className="w-full rounded-lg object-cover md:h-96 lg:h-100 bg-transparent"
            />
            <div className="text-white text-xl font-semibold text-center">
              User scans the QR code of the merchant.
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
      title: "Pay",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src={pay}
              alt="cards template"
              // width={500}
              // height={500}
              className="h-48 w-full max-w-full rounded-lg object-contain shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-60 lg:h-100"
            />
            <div className="mb-8 mt-10">
              <div className="text-white text-xl font-semibold text-center">
                User pays the converted USD amount through PayPal.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Process",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src={processing}
              alt="hero template"
              // width={500}
              // height={500}
              className="h-48 w-full max-w-full rounded-lg object-contain shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-60 lg:h-100"
            />
            <div className="text-white text-xl font-semibold text-center">
              USD is converted into PYUSD. This PYUSD is then traded for INR in
              the orderbook through the Pyrex Agent. The Pyrex Agent initiates
              the Sellers Agent to transfer the INR to the merchant's UPI.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Settle",
      content: (
        <div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src={success}
              alt="hero template"
              // width={500}
              // height={500}
              className="h-48 w-full max-w-full rounded-lg object-contain shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-60 lg:h-100"
            />
            <div className="text-white text-xl font-semibold text-center">
              Upon successful settlement, the Pyrex Agent deposits the PYUSD to
              the seller's account who had payed the INR.
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
