"use client";
import { useScroll, useTransform } from "motion/react";
import React from "react";
import { GoogleGeminiEffect } from "./components/ui/google-gemini-effect";
import { LayoutTextFlip } from "./components/ui/layout-text-flip";

export function Hero() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <div
      ref={ref}
      className="relative h-[400vh] w-full overflow-clip rounded-md bg-black pt-32 sm:pt-40 dark:border dark:border-white/[0.1]"
    >
      <div className="sticky top-36 z-40 flex justify-center">
        <div className="pointer-events-none flex flex-col items-center gap-6 text-center text-white">
          <h1 className="text-6xl font-bold">
            No
            <LayoutTextFlip text="" words={["Drama", "Hassle"]} />
          </h1>
          <p className="absolute text-5xl font-semibold mt-[400px]">
            Easy Forex
          </p>
        </div>
      </div>

      <GoogleGeminiEffect
        pathLengths={[
          pathLengthFirst,
          pathLengthSecond,
          pathLengthThird,
          pathLengthFourth,
          pathLengthFifth,
        ]}
      />
    </div>
  );
}
