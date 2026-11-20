import type { ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';

export interface FormStep {
  id: number;
  title: string;
  icon: ComponentType<{ className?: string }>;
}

interface StepProgressProps {
  steps: FormStep[];
  currentStep: number;
  /** Jump back to an earlier step; later steps stay locked until the current one is valid. */
  onGoBack: (step: number) => void;
}

/** The step indicator above the reservation form. */
export function StepProgress({ steps, currentStep, onGoBack }: StepProgressProps) {
  return (
    <nav aria-label="Reservation progress" className="mb-8">
      <ol className="flex items-center justify-center gap-2 md:gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.id} of ${steps.length}: ${step.title}${isCompleted ? ', completed' : ''}`}
                onClick={() => step.id < currentStep && onGoBack(step.id)}
                disabled={step.id > currentStep}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-hubble-600 to-hubble-500 text-white shadow-lg shadow-hubble-500/25'
                    : isCompleted
                      ? 'bg-dark-800 text-hubble-400 hover:bg-dark-700 cursor-pointer'
                      : 'bg-dark-900 text-dark-500 cursor-not-allowed'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight aria-hidden="true" className={`w-4 h-4 mx-1 ${isCompleted ? 'text-hubble-500' : 'text-dark-700'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
