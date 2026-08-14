import Link from "next/link";
import { Check } from "lucide-react";

const STEPS = [
  { label: "কার্ট", href: "/cart" },
  { label: "ঠিকানা" },
  { label: "পেমেন্ট" },
  { label: "নিশ্চিত" },
] as const;

interface CheckoutStepperProps {
  currentStep: number;
}

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <nav
      aria-label="চেকআউটের অগ্রগতি"
      className="rounded-2xl border border-minsah-border-soft bg-white px-3 py-4 shadow-sm sm:px-5"
    >
      <ol className="grid grid-cols-4 gap-1">
        {STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const marker = (
            <span
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition ${
                isComplete
                  ? "border-minsah-primary bg-minsah-primary text-minsah-light"
                  : isCurrent
                    ? "border-minsah-primary bg-minsah-light text-minsah-primary ring-2 ring-minsah-accent"
                    : "border-minsah-border-soft bg-white text-minsah-muted"
              }`}
              aria-hidden="true"
            >
              {isComplete ? <Check size={15} aria-hidden="true" /> : index + 1}
            </span>
          );

          return (
            <li key={step.label} className="relative text-center">
              {index > 0 && (
                <span
                  className={`absolute right-1/2 top-4 h-px w-full -translate-y-1/2 ${index <= currentStep ? "bg-minsah-primary" : "bg-minsah-border-soft"}`}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10">
                {"href" in step ? (
                  <Link
                    href={step.href}
                    className="inline-flex min-w-12 flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus"
                  >
                    {marker}
                    <span className="text-xs font-semibold text-minsah-muted">
                      {step.label}
                    </span>
                  </Link>
                ) : (
                  <div
                    className="inline-flex min-w-12 flex-col items-center gap-1"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {marker}
                    <span
                      className={`text-xs font-semibold ${isCurrent ? "text-minsah-primary" : "text-minsah-muted"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
