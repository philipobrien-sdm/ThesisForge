
import React from 'react';
import { X, Target, CheckCircle, ShieldCheck, GraduationCap, Briefcase, Award, BarChart3 } from 'lucide-react';
import { ThesisCandidate } from '../types';

interface ThesisContextModalProps {
  candidate: ThesisCandidate;
  onClose: () => void;
}

export const ThesisContextModal: React.FC<ThesisContextModalProps> = ({ candidate, onClose }) => {
  const score = candidate.scoring.overallScore;
  const scoreColor = score >= 80 ? 'text-emerald-700 bg-emerald-100' : score >= 60 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';

  // Complete list of metrics available in ThesisScoring
  const metrics = [
      { label: "Novelty", val: candidate.scoring.novelty },
      { label: "Feasibility", val: candidate.scoring.feasibility },
      { label: "Method Fit", val: candidate.scoring.methodFit },
      { label: "Career Align", val: candidate.scoring.careerAlignment },
      { label: "Advisor Fit", val: candidate.scoring.advisorFit },
      { label: "Ethical Ease", val: candidate.scoring.ethicalComplexity },
      { label: "Pub. Potential", val: candidate.scoring.publicationPotential },
      { label: "Data Avail.", val: candidate.scoring.dataAvailability },
      { label: "Scope", val: candidate.scoring.scope },
      { label: "Clarity", val: candidate.scoring.clarity },
      { label: "Narrative", val: candidate.scoring.narrativeStrength },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${scoreColor}`}>
                    Overall Score: {score}/100
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Research Charter</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{candidate.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Thesis Statement */}
          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
             <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <GraduationCap size={16} /> Thesis Statement
             </h3>
             <p className="text-slate-700 text-sm font-medium italic leading-relaxed">
                "{candidate.thesisStatement}"
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Methodology */}
             <div className="flex flex-col h-full">
                 <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Target size={16} className="text-slate-500" /> Proposed Methodology
                 </h3>
                 <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 flex-1">
                    {candidate.methodologyHint}
                 </p>
             </div>
             
             {/* Scoring Breakdown */}
             <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <BarChart3 size={16} className="text-indigo-500" />
                    <h5 className="text-xs font-bold text-slate-700 uppercase">Complete Feasibility Matrix</h5>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {metrics.map((m) => (
                        <div key={m.label} className="flex items-center justify-between text-xs group">
                            <span className="text-slate-500 font-medium group-hover:text-slate-800 transition-colors">{m.label}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${m.val >= 8 ? 'bg-emerald-500' : m.val >= 5 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${Math.min(m.val * 10, 100)}%` }} 
                                    />
                                </div>
                                <span className="font-mono font-bold w-4 text-right text-slate-700">{m.val}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase mb-2">
                      <CheckCircle size={14} /> Key Strengths
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                      {candidate.scoring.strengths}
                  </p>
              </div>
              <div>
                  <span className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase mb-2">
                      <ShieldCheck size={14} /> Potential Concerns
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                      {candidate.scoring.concerns}
                  </p>
              </div>
          </div>

        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">ThesisForge Candidate Snapshot</p>
        </div>
      </div>
    </div>
  );
};
