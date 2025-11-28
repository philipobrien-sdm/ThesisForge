
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Target, MousePointer2 } from 'lucide-react';

interface Step {
  targetId?: string; // data-tutorial-id
  title: string;
  content: string;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

const STEPS: Step[] = [
  {
    title: "Welcome to ThesisForge",
    content: "Your disciplined AI Research Assistant. This tool helps you structure, draft, and visualize your Doctoral Thesis roadmap using advanced AI.",
    position: 'center'
  },
  {
    targetId: 'node-root',
    title: "The Thesis Roadmap",
    content: "This is your generated roadmap. It follows the standard academic structure (Intro, Lit Review, Methodology...). Click ANY node to access the Researcher Tools.",
    position: 'right'
  },
  {
    targetId: 'node-root', // Ideally point to a specific tool button if possible, but root context works
    title: "Expand & Deepen",
    content: "Use 'Expand' to break chapters into sub-sections. Use 'Details' to have the AI write a rigorous academic draft for that specific section.",
    position: 'bottom'
  },
  {
    targetId: 'node-root',
    title: "Process Engineering",
    content: "For Methodology chapters, use the 'Process' tool to map out your experimental protocols or data collection workflows diagrammatically.",
    position: 'bottom'
  },
  {
    targetId: 'node-root',
    title: "Document Builder",
    content: "Click 'Doc' on any node to open the Editor. Here you can write your summaries, review AI drafts, and track dependencies between chapters.",
    position: 'bottom'
  },
  {
    targetId: 'sidebar-menu-btn', // Needs to correspond to App.tsx
    title: "Project Tools",
    content: "Open the menu to access the Systems View (Architecture), Concept Cloud, Reference Manager, and Export options.",
    position: 'right'
  },
  {
    title: "Ready to Research",
    content: "You are set! Start by inputting your thesis topic, selecting a candidate approach, and letting ThesisForge build your roadmap.",
    position: 'center'
  }
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const step = STEPS[currentStep];

  useEffect(() => {
    const updatePosition = () => {
        if (!step.targetId) {
            setTargetRect(null);
            return;
        }
        
        // Find element by data attribute
        const element = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            // Fallback if element not found yet (e.g. animation delay)
            setTargetRect(null);
        }
    };

    // Small delay to allow DOM to settle if changing views
    setTimeout(updatePosition, 300);
    
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, step.targetId]);

  const handleNext = () => {
      if (currentStep < STEPS.length - 1) {
          setCurrentStep(c => c + 1);
      } else {
          onComplete();
      }
  };

  const handlePrev = () => {
      if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  // Calculate modal position based on target
  const getModalStyle = () => {
      if (!targetRect || step.position === 'center') {
          return {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '450px'
          };
      }

      const gap = 20;
      const modalWidth = 320;
      
      let top = targetRect.top;
      let left = targetRect.left;

      switch(step.position) {
          case 'right':
              left = targetRect.right + gap;
              top = targetRect.top + (targetRect.height / 2) - 100;
              break;
          case 'left':
              left = targetRect.left - modalWidth - gap;
              top = targetRect.top + (targetRect.height / 2) - 100;
              break;
          case 'bottom':
              left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
              top = targetRect.bottom + gap;
              break;
          case 'top':
              left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
              top = targetRect.top - 200 - gap;
              break;
      }

      // Safety bounds check could go here
      
      return {
          top: `${top}px`,
          left: `${left}px`,
          width: `${modalWidth}px`
      };
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop with "Hole" via clip-path if target exists, else simple dim */}
        <div 
            className="absolute inset-0 bg-slate-900/60 transition-all duration-500 ease-in-out"
            style={targetRect ? {
                backgroundColor: 'rgba(15, 23, 42, 0.7)'
            } : {}}
        />

        {/* Highlight Box (Spotlight) */}
        {targetRect && (
            <div 
                className="absolute border-2 border-white rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] transition-all duration-500 ease-in-out pointer-events-none"
                style={{
                    top: targetRect.top - 5,
                    left: targetRect.left - 5,
                    width: targetRect.width + 10,
                    height: targetRect.height + 10,
                    zIndex: 10
                }}
            >
                {/* Pulsing indicator */}
                <span className="absolute -top-2 -right-2 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                </span>
                
                {/* Connector Line to Modal (Visual Flourish) */}
                <div className={`absolute w-0 h-0 border-8 border-transparent ${
                    step.position === 'right' ? 'border-r-white -right-[22px] top-1/2 -mt-2' :
                    step.position === 'bottom' ? 'border-b-white -bottom-[22px] left-1/2 -ml-2' : ''
                }`} />
            </div>
        )}

        {/* Tutorial Card */}
        <div 
            className="absolute bg-white rounded-xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-300 transition-all ease-out z-50 border border-slate-200"
            style={getModalStyle() as React.CSSProperties}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Step {currentStep + 1} / {STEPS.length}
                    </span>
                </div>
                <button onClick={onComplete} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                </button>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.content}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                <button 
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 flex items-center gap-1"
                >
                    <ChevronLeft size={14} /> Back
                </button>
                
                <button 
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
                >
                    {currentStep === STEPS.length - 1 ? "Finish Tutorial" : "Next"} <ChevronRight size={14} />
                </button>
            </div>
        </div>
    </div>
  );
};
