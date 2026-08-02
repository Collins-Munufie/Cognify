import React, { useState, useEffect } from 'react';
import { BrainCircuit, CheckCircle2, Loader2 } from 'lucide-react';

export default function AIProcessingScreen({ isGenerating }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(5);

  const steps = [
    "Reading document...",
    "Understanding concepts...",
    "Extracting key ideas...",
    "Creating flashcards...",
    "Building quizzes...",
    "Preparing tutor..."
  ];

  useEffect(() => {
    if (!isGenerating) {
      // Reset state when not active
      setCurrentStep(0);
      setProgress(5);
      return;
    }

    // Transition steps based on time
    const stepIntervals = [2000, 3000, 3000, 3000, 3000]; // Durations for first 5 steps
    let timeoutId;

    const runSteps = (index) => {
      if (index < steps.length - 1) {
        timeoutId = setTimeout(() => {
          setCurrentStep(index + 1);
          runSteps(index + 1);
        }, stepIntervals[index]);
      }
    };

    runSteps(0);

    // Progress bar simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 4; // Fast initial progress
        if (prev < 75) return prev + 2; // Medium progress
        if (prev < 96) return prev + 0.8; // Slower near the end
        return prev; // Cap at 96% until done
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/85 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out_forwards]">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel p-8 sm:p-10 max-w-md w-full border border-brand-border/40 bg-brand-surface/75 shadow-[0_0_50px_rgba(255,130,67,0.15)] flex flex-col items-center relative rounded-[2.5rem]">
        {/* Animated brain logo */}
        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mb-8 relative border border-brand-primary/20 shadow-inner">
          <BrainCircuit className="w-10 h-10 animate-pulse" />
          <div className="absolute -inset-1 bg-brand-primary rounded-3xl blur opacity-30 animate-pulse"></div>
        </div>

        <h3 className="text-2xl font-black mb-1 tracking-tight text-center">Cognify AI Engine</h3>
        <p className="text-brand-muted text-sm mb-6 text-center font-medium">Synthesizing study tools from your content...</p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border/30 mb-8">
          <div 
            className="h-full bg-gradient-to-r from-brand-primary to-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Steps List */}
        <div className="w-full space-y-4">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            const isPending = idx > currentStep;

            return (
              <div 
                key={step}
                className={`flex items-center gap-4 transition-all duration-300 ${
                  isActive ? 'scale-[1.02] text-brand-primary font-bold' : isCompleted ? 'text-brand-text/60' : 'text-brand-muted opacity-40'
                }`}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 stroke-[3]" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-brand-border flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <span className="text-lg">{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
