"use client";

import { Check } from "lucide-react";

interface Step {
  label: string;
  status: "completed" | "current" | "upcoming";
}

interface PublicProgressStepsProps {
  steps: Step[];
}

export function PublicProgressSteps({ steps }: PublicProgressStepsProps) {
  return (
    <nav aria-label="Voortgang" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li
            key={index}
            className={`flex-1 ${index !== steps.length - 1 ? "pr-2" : ""}`}
          >
            <div className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                    step.status === "completed"
                      ? "bg-green-500 text-white"
                      : step.status === "current"
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step.status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold text-sm">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-xs sm:text-sm font-medium text-center transition-colors ${
                    step.status === "current"
                      ? "text-blue-600 dark:text-blue-400"
                      : step.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index !== steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                    steps[index + 1]?.status === "completed" ||
                    step.status === "completed"
                      ? "bg-green-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
