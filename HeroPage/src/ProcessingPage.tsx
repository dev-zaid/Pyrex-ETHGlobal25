import { useState, useEffect } from "react";

export function ProcessingPage() {
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCompleted(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 px-6 py-16 text-white">
      <section className="relative flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute -inset-6 rounded-full bg-indigo-500/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 rounded-full border border-white/10"
            aria-hidden="true"
          />
          {!isCompleted ? (
            <div
              className="h-16 w-16 rounded-full border-4 border-white/20 border-t-indigo-400 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          <span className="sr-only">
            {isCompleted ? "Payment completed" : "Transaction processing"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
          {isCompleted
            ? "Payment Successfully Completed"
            : "Transforming Money at Lightning Speed"}
        </h1>
      </section>
    </main>
  );
}
