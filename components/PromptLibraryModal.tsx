
import React, { useState } from 'react';
import { X, Terminal, Copy, Check } from 'lucide-react';

interface PromptTemplate {
    title: string;
    description: string;
    template: string;
}

const TEMPLATES: PromptTemplate[] = [
    {
        title: "Thesis Candidate Generation",
        description: "Generates 3 distinct thesis angles based on a topic, tailored to the candidate's profile.",
        template: `ACT AS: Disciplined Research Assistant AI.
CONTEXT: Candidate Profile (Degree: {degree}, Field: {field}, Skills: {skills}).

TASK: Generate 3 distinct, viable Thesis candidates for topic "{topic}".

For each candidate, provide a rigorous scoring analysis (0-100) based on:
- Novelty & Contribution
- Feasibility (matching Candidate Skills)
- Career Alignment
- Ethical Complexity

Output JSON.`
    },
    {
        title: "Roadmap Expansion",
        description: "Recursively breaks down a thesis chapter into sub-sections.",
        template: `CONTEXT PATH: {parent} > {node}
SOURCE TEXT: ...{context_snippet}...

TASK: Expand this section into logical sub-components suitable for a Doctoral Thesis.
- Ensure logical flow.
- Suggest specific "Follow-up Prompts" for each new node.
- Include standard academic references if applicable.

Output JSON Array of Child Nodes.`
    },
    {
        title: "Academic Detailing (Skeleton)",
        description: "Drafts a high-density structural skeleton for a section.",
        template: `ROLE: Disciplined Research Assistant.
TOPIC: "{node_label}"
CONTEXT: {full_path}

INSTRUCTION:
Provide a comprehensive **Bullet Point Skeleton** for this section.

STRUCTURE:
- **Key Theoretical Concepts**: Definitions and framework.
- **Core Arguments/Points**: The main body of text, broken down logically.
- **Data/Evidence Needed**: Placeholders for specific data points.
- **References**: Integrate citations where specific claims are made.

Goal: Maximize information density within ~500 words to guide the user in drafting the full text.`
    },
    {
        title: "Process Engineering",
        description: "Converts text descriptions into structured logical workflows.",
        template: `TASK: Extract Process Flow.
CONTEXT: "{node_label}"

Identify:
1. Sequential Actions (Step 1, Step 2...)
2. Decision Gates (If X -> Then Y)
3. Roles/Actors (Who performs the action?)

Output JSON: [{ stepNumber, action, role, description, type, branches... }]`
    },
    {
        title: "Academic Critique (Review Board)",
        description: "Simulates a tough thesis defense or review board.",
        template: `ACT AS: Strict Academic Review Board Member.
CONTENT TO REVIEW: "{content}"

TASK: Generate {count} critical, probing challenge questions.
Focus on:
- Methodology weak points
- Logical gaps
- Lack of evidence
- Scope creep

Output JSON Array of strings.`
    }
];

export const PromptLibraryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Terminal size={20} className="text-purple-600"/> 
                        AI Prompt Blueprints
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <p className="text-sm text-slate-600 mb-6 max-w-2xl">
                        ThesisForge uses strictly structured prompts to ensure the AI behaves as a disciplined academic assistant. 
                        Below are the "System Instructions" used to drive the core features.
                    </p>

                    <div className="grid grid-cols-1 gap-6">
                        {TEMPLATES.map((t, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm">{t.title}</h4>
                                        <p className="text-xs text-slate-500">{t.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(t.template, idx)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Copy Template"
                                    >
                                        {copiedIndex === idx ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>}
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-900 overflow-x-auto">
                                    <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed">
                                        {t.template}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-white text-center text-xs text-slate-400">
                    * Parameters wrapped in {'{brackets}'} are dynamically injected at runtime based on your data.
                </div>
            </div>
        </div>
    );
};
