"use client";
import { cn } from "../../lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { motion, MotionValue, useTransform } from "motion/react";

// 6 end-point icons
import img1 from "../../assets/dollar-coin.png";
import img2 from "../../assets/ruppee.jpg";
import img3 from "../../assets/yen.png";
import img4 from "../../assets/euro.png";
import img5 from "../../assets/pound.png";
import img6 from "../../assets/rubles.png";

// center PayPal
import paypal from "../../assets/paypal.svg";

const transition = { duration: 0 };
const TRIM_PX = 50;

function useTrim(
  ref: React.RefObject<SVGPathElement | null>,
  trimPx = TRIM_PX
) {
  const [fractions, setFractions] = useState({ offset: 0, visible: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.getTotalLength) return;
    const L = el.getTotalLength();
    if (!L || L <= trimPx * 2) {
      setFractions({ offset: 0, visible: 1 });
      return;
    }
    const offset = trimPx / L;
    const visible = 1 - 2 * offset;
    setFractions({ offset, visible });
  }, [ref, trimPx]);
  return fractions;
}

export const GoogleGeminiEffect = ({
  pathLengths,
  title,
  description,
  className,
}: {
  pathLengths: MotionValue[];
  title?: string;
  description?: string;
  className?: string;
}) => {
  const a1 = useRef<SVGPathElement>(null);
  const a2 = useRef<SVGPathElement>(null);
  const a3 = useRef<SVGPathElement>(null);

  const fA1 = useTrim(a1);
  const fA2 = useTrim(a2);
  const fA3 = useTrim(a3);

  const plA1 = useTransform(pathLengths[4], (v) => v * fA1.visible);
  const plA2 = useTransform(pathLengths[4], (v) => v * fA2.visible);
  const plA3 = useTransform(pathLengths[4], (v) => v * fA3.visible);

  const [coinPositions, setCoinPositions] = useState<
    { x: number; y: number }[]
  >([]);

  useEffect(() => {
    const refs = [a1.current, a2.current, a3.current];
    const positions: { x: number; y: number }[] = [];

    refs.forEach((el) => {
      if (!el) return;
      const L = el.getTotalLength();
      if (!L) return;
      positions.push(el.getPointAtLength(TRIM_PX)); // left
      positions.push(el.getPointAtLength(L - TRIM_PX)); // right
    });

    setCoinPositions(positions);
  }, []);

  // ensure bundler resolves .src if needed
  const coinImages = [img1, img2, img3, img4, img5, img6].map((i) =>
    typeof i === "string" ? i : (i as any).src
  );
  const paypalSrc = typeof paypal === "string" ? paypal : (paypal as any).src;

  return (
    <div className={cn("sticky top-1/2 -translate-y-1/2 -mt-20", className)}>
      <p className="text-lg md:text-7xl font-normal pb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-300">
        {title}
      </p>
      <p className="text-xs md:text-xl font-normal text-center text-neutral-400 mt-4 max-w-lg mx-auto">
        {description}
      </p>

      {/* Center PayPal logo (kept as overlay HTML img) */}
      <div className="w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center absolute z-10">
        <img src={paypalSrc} width={128} height={128} className="m-auto z-20" />
      </div>

      <svg
        width="1200"
        height="890"
        viewBox="0 0 1440 890"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-1/2 -translate-y-1/2 w-full"
      >
        <defs>
          <filter id="blurMe" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
        <path
          d="M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364"
          stroke="#076EFF"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
          stroke="#FFB7C5"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />

        <path
          d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
          stroke="#B1C5FF"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        {/* </g> */}

        {/* 3 animated paths */}
        <motion.path
          ref={a1}
          d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
          stroke="#FFB7C5"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: plA1, pathOffset: fA1.offset }}
          transition={transition}
        />
        <motion.path
          ref={a2}
          d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
          stroke="#B1C5FF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: plA2, pathOffset: fA2.offset }}
          transition={transition}
        />
        <motion.path
          ref={a3}
          d="M0 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1409 364"
          stroke="#076EFF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: plA3, pathOffset: fA3.offset }}
          transition={transition}
        />

        {/* 6 currency icons */}
        {coinPositions.map((pos, idx) => (
          <image
            key={idx}
            href={coinImages[idx]}
            x={pos.x - 20}
            y={pos.y - 20}
            width={40}
            height={40}
          />
        ))}
      </svg>
    </div>
  );
};
