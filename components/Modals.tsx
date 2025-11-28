
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as d3 from 'd3';
import { 
    X, Sparkles, Lock, Unlock, Save, RotateCcw, Clock, Terminal, PenLine,
    LayoutList, GitGraph, Plus, Trash2, Download, Split, CornerDownRight, 
    ArrowDown, Bold, Italic, List, Heading, Code, RectangleVertical, 
    RectangleHorizontal, ZoomIn, ZoomOut, Edit3, CheckCircle, Octagon, History,
    Columns, Activity, AlertTriangle, Loader2, ArrowRight, MessageCircle, AlertCircle, PlayCircle, Scale,
    Rows, ListOrdered, GitBranch, Edit, Play, FileText
} from 'lucide-react';
import { ProcessStep, ProcessBranch, LogEntry, AppTheme, MindMapData, ChallengeEntry, ContentVersion } from '../types';
import { SesarLogo } from './SesarLogo';
import { exportSvgToPng } from '../utils/imageExporter';

// --- SHARED MODAL BASE ---
const ModalBase: React.FC<{ title: string, onClose: () => void, children: React.ReactNode, headerAction?: React.ReactNode }> = ({ title, onClose, children, headerAction }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] transition-all duration-300 flex flex-col overflow-hidden animate-in zoom-in-95">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate pr-4">{title}</h2>
        <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={20} />
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative min-h-0">
        {children}
      </div>
    </div>
  </div>
);

// --- Refine Input Component (Shared) ---
const RefineInput: React.FC<{ onRefine: (guidance: string) => void, onCancel: () => void }> = ({ onRefine, onCancel }) => {
    const [guidance, setGuidance] = useState('');
    return (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-purple-100 overflow-hidden">
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                        <Sparkles size={16} /> Refine with AI
                    </h3>
                    <button onClick={onCancel}><X size={16} className="text-purple-400 hover:text-purple-600" /></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-3">How should the AI improve this content? (e.g. "Make it more concise", "Add details about X")</p>
                    <textarea 
                        autoFocus
                        value={guidance}
                        onChange={(e) => setGuidance(e.target.value)}
                        className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none mb-4"
                        placeholder="Enter instructions..."
                    />
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="flex-1 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button 
                            onClick={() => onRefine(guidance)}
                            disabled={!guidance.trim()}
                            className="flex-1 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            Refine Content <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Challenges Panel ---
const ChallengesPanel: React.FC<{ 
    challenges: ChallengeEntry[]; 
    onChallenge: (text: string) => Promise<void>; 
    onApplyUpdate: (challenge: string) => void; 
    onGenerateCritiques?: (count: number) => Promise<string[]>;
}> = ({ challenges, onChallenge, onApplyUpdate, onGenerateCritiques }) => {
    const [newChallenge, setNewChallenge] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [critiqueCount, setCritiqueCount] = useState(3);
    const [generatedCritiques, setGeneratedCritiques] = useState<string[]>([]);
    const [isGeneratingCritiques, setIsGeneratingCritiques] = useState(false);

    const handleSubmit = async (text: string) => {
        if(!text.trim()) return;
        setIsSubmitting(true);
        await onChallenge(text);
        setNewChallenge('');
        // Remove from generated list if it was one of them
        setGeneratedCritiques(prev => prev.filter(c => c !== text));
        setIsSubmitting(false);
    };

    const handleGenerate = async () => {
        if (!onGenerateCritiques) return;
        setIsGeneratingCritiques(true);
        setGeneratedCritiques([]);
        try {
            const results = await onGenerateCritiques(critiqueCount);
            setGeneratedCritiques(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingCritiques(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Main List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* AI Review Board Section */}
                {onGenerateCritiques && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                <Scale size={16} /> AI Academic Review Board
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-700 font-medium">Questions:</span>
                                <select 
                                    value={critiqueCount} 
                                    onChange={(e) => setCritiqueCount(Number(e.target.value))} 
                                    className="text-xs bg-white border border-amber-200 rounded px-2 py-1 outline-none"
                                >
                                    {[1, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGeneratingCritiques}
                                    className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {isGeneratingCritiques ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    Generate Challenges
                                </button>
                            </div>
                        </div>
                        
                        {generatedCritiques.length > 0 ? (
                            <div className="space-y-2">
                                {generatedCritiques.map((critique, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-amber-100 flex gap-3 items-start animate-in slide-in-from-top-2">
                                        <p className="text-xs text-slate-700 flex-1 leading-relaxed">"{critique}"</p>
                                        <button 
                                            onClick={() => handleSubmit(critique)}
                                            disabled={isSubmitting}
                                            className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded shrink-0 transition-colors"
                                        >
                                            Issue Challenge
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !isGeneratingCritiques && (
                                <p className="text-xs text-amber-700/60 italic text-center py-2">
                                    Click generate to have the AI identify potential weaknesses in this section.
                                </p>
                            )
                        )}
                    </div>
                )}

                {/* Existing Challenges List */}
                {challenges.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                        <AlertCircle size={32} className="mx-auto mb-2 opacity-50"/>
                        <p className="text-sm">No active challenges recorded.</p>
                    </div>
                )}
                {challenges.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="bg-red-100 text-red-600 p-1.5 rounded-full shrink-0"><AlertTriangle size={14}/></div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">{c.userQuery}</p>
                                <span className="text-[10px] text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="pl-9 text-sm text-slate-600 border-l-2 border-slate-100 ml-3">
                            <ReactMarkdown>{c.aiResponse}</ReactMarkdown>
                        </div>
                        <div className="mt-3 pl-9 flex justify-end">
                            <button onClick={() => onApplyUpdate(c.userQuery)} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-bold hover:bg-indigo-100 flex items-center gap-1 transition-colors">
                                <Sparkles size={12}/> Update Node based on this
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Input Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <textarea 
                    value={newChallenge} 
                    onChange={e => setNewChallenge(e.target.value)} 
                    className="w-full h-20 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none mb-2"
                    placeholder="Manually enter a challenge or critique..."
                />
                <button 
                    onClick={() => handleSubmit(newChallenge)} 
                    disabled={isSubmitting || !newChallenge.trim()} 
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <MessageCircle size={16}/>}
                    Submit Manual Challenge
                </button>
            </div>
        </div>
    );
};

// --- History Panel ---
const HistoryPanel: React.FC<{ 
    history: ContentVersion[]; 
    onRestore: (version: ContentVersion) => void; 
    type: 'details' | 'process'; 
}> = ({ history, onRestore, type }) => {
    return (
        <div className="h-full overflow-y-auto p-4 bg-slate-50">
            {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <History size={32} className="mx-auto mb-2 opacity-50"/>
                    <p className="text-sm">No version history available.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm group hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v.reason}</span>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(v.timestamp).toLocaleString()}</p>
                                </div>
                                <button onClick={() => onRestore(v)} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-bold hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1 transition-colors">
                                    <RotateCcw size={12}/> Restore
                                </button>
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded">
                                {type === 'details' ? (v.content as string) : `${(v.content as ProcessStep[]).length} Steps`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ... IdeaModal ...
export const IdeaModal: React.FC<{ 
    onConfirm: (idea: string) => void; 
    onClose: () => void 
}> = ({ onConfirm, onClose }) => {
    const [idea, setIdea] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (idea.trim()) {
            onConfirm(idea);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-600"/> Generate from Topic
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Enter a topic below. The AI will generate a structured, 1000-word analytical deep-dive covering concepts, stakeholders, technology, benefits, and implementation pathways.
                    </p>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Topic</label>
                    <textarea 
                        value={idea} 
                        onChange={(e) => setIdea(e.target.value)} 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6 h-24 resize-none text-sm font-medium"
                        placeholder="e.g. Advanced Air Mobility Integration"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={!idea.trim()} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Generate Exploration</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ... DetailsModal ...
interface DetailsModalProps {
    title: string;
    content: string;
    isLocked: boolean;
    history?: ContentVersion[];
    challenges?: ChallengeEntry[];
    onToggleLock: () => void;
    onSave: (newContent: string) => void;
    onRefine?: (guidance: string) => void;
    onChallenge?: (text: string) => Promise<void>;
    onGenerateCritiques?: (count: number) => Promise<string[]>;
    onClose: () => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ title, content, isLocked, history = [], challenges = [], onToggleLock, onSave, onRefine, onChallenge, onGenerateCritiques, onClose }) => {
    const [value, setValue] = useState(content);
    const [isEditing, setIsEditing] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'challenges' | 'history'>('content');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { if(isLocked) setIsEditing(false); }, [isLocked]);
    useEffect(() => { setValue(content); }, [content]);

    const insertFormat = (prefix: string, suffix: string = '') => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);
        setValue(`${before}${prefix}${selection}${suffix}${after}`);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
            }
        }, 0);
    };

    return (
        <ModalBase 
            title={`Details: ${title}`} 
            onClose={onClose}
            headerAction={
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                        <button onClick={() => setActiveTab('content')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'content' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Content</button>
                        <button onClick={() => setActiveTab('challenges')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'challenges' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Challenges ({challenges.length})</button>
                        <button onClick={() => setActiveTab('history')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'history' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
                    </div>
                    {activeTab === 'content' && (
                        <>
                            {onRefine && (
                                <button 
                                    onClick={() => setIsRefining(true)} 
                                    className="p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700" 
                                    title="Refine with AI"
                                >
                                    <Sparkles size={16} /> Refine
                                </button>
                            )}
                            <button onClick={onToggleLock} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isLocked ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-600'}`} title={isLocked ? "Unlock to Edit" : "Lock Content"}>
                                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                            {!isLocked && (
                                <button 
                                    onClick={() => {
                                        if (isEditing) onSave(value);
                                        setIsEditing(!isEditing);
                                    }}
                                    className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {isEditing ? <><Save size={16}/> Save</> : <><Edit3 size={16}/> Edit</>}
                                </button>
                            )}
                        </>
                    )}
                </div>
            }
        >
            <div className="h-full flex flex-col relative">
                {isRefining && onRefine && (
                    <RefineInput 
                        onRefine={(g) => { onRefine(g); setIsRefining(false); }} 
                        onCancel={() => setIsRefining(false)} 
                    />
                )}

                {activeTab === 'content' && (
                    <>
                        {isEditing && !isLocked && (
                            <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50">
                                <button onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Bold size={16}/></button>
                                <button onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Italic size={16}/></button>
                                <button onClick={() => insertFormat('## ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Heading size={16}/></button>
                                <button onClick={() => insertFormat('- ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><List size={16}/></button>
                                <button onClick={() => insertFormat('`', '`')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Code size={16}/></button>
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            {isEditing && !isLocked ? (
                                <div className="flex h-full">
                                    <div className="w-1/2 h-full border-r border-slate-200 flex flex-col">
                                        <textarea 
                                            ref={textareaRef}
                                            className="w-full h-full p-4 focus:ring-0 outline-none font-mono text-sm leading-relaxed resize-none bg-slate-50"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            placeholder="Enter markdown..."
                                        />
                                    </div>
                                    <div className="w-1/2 h-full overflow-y-auto p-6 bg-white">
                                        <div className="prose prose-sm max-w-none text-slate-600"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto p-6 bg-white">
                                    <div className="prose prose-sm max-w-none text-slate-700"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'challenges' && onChallenge && onRefine && (
                    <ChallengesPanel 
                        challenges={challenges} 
                        onChallenge={onChallenge} 
                        onGenerateCritiques={onGenerateCritiques}
                        onApplyUpdate={(guidance) => {
                            onRefine(guidance);
                            setActiveTab('content');
                        }} 
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryPanel 
                        history={history} 
                        type="details" 
                        onRestore={(v) => { 
                            onSave(v.content as string); 
                            setActiveTab('content'); 
                        }} 
                    />
                )}
            </div>
        </ModalBase>
    );
};

// ... MermaidViewer ...
const MermaidViewer: React.FC<{ code: string; title?: string }> = ({ code, title }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        setSvg('');
        setError(null);
        if (!code) return;
        const render = async () => {
            try {
                const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default;
                mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', suppressErrorRendering: true });
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                setSvg(svg);
            } catch (e: any) {
                console.warn("Mermaid render error:", e);
                setError(e.message || "Syntax Error");
            }
        };
        const timeoutId = setTimeout(render, 200); 
        return () => clearTimeout(timeoutId);
    }, [code]);

    const handleExport = () => {
        if (!containerRef.current) return;
        const svgElement = containerRef.current.querySelector('svg');
        if (!svgElement) return;

        let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const viewBox = svgElement.getAttribute('viewBox');
        
        if (viewBox) {
            const [minX, minY, width, height] = viewBox.split(/[\s,]+/).map(Number);
            bounds = { minX, maxX: minX + width, minY, maxY: minY + height };
        } else {
            const width = parseFloat(svgElement.getAttribute('width') || '0') || svgElement.clientWidth;
            const height = parseFloat(svgElement.getAttribute('height') || '0') || svgElement.clientHeight;
            bounds = { minX: 0, maxX: width, minY: 0, maxY: height };
        }

        const cleanTitle = (title || 'Diagram').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${cleanTitle}-${timestamp}.png`;

        exportSvgToPng(svgElement, bounds, filename, 20);
    };

    if (error) return <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-lg"><AlertTriangle size={24} className="mb-2" /><p className="font-bold text-sm">Diagram Syntax Error</p><p className="font-mono text-xs mt-1 max-w-md break-words text-center">{error}</p></div>;
    if (!svg && code) return <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Loader2 size={32} className="animate-spin mb-2" /><p className="text-xs font-medium">Rendering Diagram...</p></div>;
    
    return (
        <div className="relative w-full h-full group">
             <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center w-full h-full overflow-auto mermaid-container p-4" />
             {svg && (
                 <button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow-lg hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Export PNG">
                    <Download size={16} />
                 </button>
             )}
        </div>
    );
};

// --- Process Flow Chart ---
interface DisplayNode { id: string; data: any; children?: DisplayNode[]; type: 'step' | 'placeholder'; label?: string; }

const ProcessFlowChart: React.FC<{ steps: ProcessStep[]; orientation: 'vertical' | 'horizontal'; title: string; theme: AppTheme }> = ({ steps, orientation, title, theme }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { root, minX, maxX, minY, maxY } = useMemo(() => {
        if (!steps.length) return { root: null, width: 0, height: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const idMap = new Map<string, ProcessStep>();
        steps.forEach(s => idMap.set(s.id, s));
        const buildTree = (step: ProcessStep, visited: Set<string>): DisplayNode => {
            if (visited.has(step.id)) return { id: `loop-${step.id}-${Math.random().toString(36).substr(2, 9)}`, data: { ...step, action: `↩ Loop to Step ${step.stepNumber}`, role: 'Process Cycle' }, type: 'step', children: [] };
            const newVisited = new Set(visited); newVisited.add(step.id);
            const node: DisplayNode = { id: step.id, data: step, type: 'step', children: [] };
            if (step.type === 'decision' && step.branches) { 
                step.branches.forEach(branch => { 
                    if (branch.targetStepId) { 
                        const targetStep = idMap.get(branch.targetStepId); 
                        if (targetStep) { 
                            const childNode = buildTree(targetStep, newVisited); 
                            childNode.label = branch.label; 
                            node.children?.push(childNode); 
                        } 
                    } else { 
                        node.children?.push({ id: `missing-${branch.id}`, data: { action: "Undefined Path" }, type: 'placeholder', label: branch.label, children: [] }); 
                    } 
                }); 
            } else { 
                if (!step.isEndState) { 
                    // Robust check: Compare as numbers to avoid string/number mismatch
                    const next = steps.find(s => Number(s.stepNumber) === Number(step.stepNumber) + 1); 
                    if (next) node.children?.push(buildTree(next, newVisited)); 
                } 
            }
            return node;
        };
        const firstStep = steps.reduce((prev, curr) => Number(prev.stepNumber) < Number(curr.stepNumber) ? prev : curr);
        const treeData = buildTree(firstStep, new Set());
        const hierarchy = d3.hierarchy(treeData);
        const isPortrait = orientation === 'vertical';
        const nodeW = 240, nodeH = 150; 
        const tree = d3.tree<DisplayNode>().nodeSize(isPortrait ? [nodeW, nodeH] : [nodeH, nodeW]); 
        const root = tree(hierarchy);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        root.each((d: any) => { const realX = isPortrait ? d.x : d.y; const realY = isPortrait ? d.y : d.x; const halfWidth = 110; const halfHeight = 70; if (realX - halfWidth < minX) minX = realX - halfWidth; if (realX + halfWidth > maxX) maxX = realX + halfWidth; if (realY - halfHeight < minY) minY = realY - halfHeight; if (realY + halfHeight > maxY) maxY = realY + halfHeight; });
        return { root, minX, minY, maxX, maxY };
    }, [steps, orientation]);

    useEffect(() => {
        if (!svgRef.current || !gRef.current || !root) return;
        const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (e) => { d3.select(gRef.current).attr('transform', e.transform.toString()); });
        const svg = d3.select(svgRef.current); svg.call(zoom);
        if (wrapperRef.current) { const { clientWidth } = wrapperRef.current; const contentWidth = maxX - minX + 200; const initialScale = Math.min(clientWidth / contentWidth, 1) * 0.9; const midX = (minX + maxX) / 2; d3.zoomIdentity.translate(clientWidth/2 - midX*initialScale, 80 - minY*initialScale).scale(initialScale); svg.call(zoom.transform, d3.zoomIdentity.translate(clientWidth/2 - midX*initialScale, 80 - minY*initialScale).scale(initialScale)); }
    }, [root, orientation]);

    useEffect(() => {
        if (!gRef.current || !root) return;
        const isPortrait = orientation === 'vertical';
        const g = d3.select(gRef.current); g.selectAll("*").remove();
        const linkGenerator = isPortrait ? d3.linkVertical().x((d: any) => d.x).y((d: any) => d.y) : d3.linkHorizontal().x((d: any) => d.y).y((d: any) => d.x);
        g.selectAll(".link").data(root.links()).enter().append("path").attr("d", linkGenerator as any).attr("fill", "none").attr("stroke", (d: any) => d.target.data.type === 'placeholder' ? "#94a3b8" : theme.link).attr("stroke-width", 2).attr("stroke-dasharray", (d: any) => d.target.data.type === 'placeholder' ? "5,5" : "none");
        const labelGroups = g.selectAll(".link-label-group").data(root.links().filter((d: any) => d.target.data.label)).enter().append("g").attr("transform", (d: any) => { const x = isPortrait ? (d.source.x + d.target.x) / 2 : (d.source.y + d.target.y) / 2; const y = isPortrait ? (d.source.y + d.target.y) / 2 : (d.source.x + d.target.x) / 2; return `translate(${x},${y})`; });
        labelGroups.each(function(d: any) { const group = d3.select(this); const text = d.target.data.label; const words = text.split(/\s+/); let lines = []; let currentLine = words[0]; for(let i=1; i<words.length; i++) { if((currentLine + " " + words[i]).length > 18) { lines.push(currentLine); currentLine = words[i]; } else { currentLine += " " + words[i]; } } lines.push(currentLine); const lineHeight = 11; const boxWidth = 110; const boxHeight = (lines.length * lineHeight) + 12; group.append("rect").attr("x", -boxWidth/2).attr("y", -boxHeight/2).attr("width", boxWidth).attr("height", boxHeight).attr("rx", 4).attr("fill", "white").attr("stroke", theme.link).attr("stroke-width", 1); const textEl = group.append("text").attr("text-anchor", "middle").attr("fill", "#ea580c").attr("font-size", "10px").attr("font-weight", "bold").attr("y", -((lines.length - 1) * lineHeight) / 2 + 3); lines.forEach((line, i) => { textEl.append("tspan").attr("x", 0).attr("dy", i === 0 ? 0 : lineHeight).text(line); }); });
        const nodes = g.selectAll(".node").data(root.descendants()).enter().append("g").attr("transform", (d: any) => isPortrait ? `translate(${d.x},${d.y})` : `translate(${d.y},${d.x})`);
        nodes.each(function(d: any) { const el = d3.select(this); const isPlaceholder = d.data.type === 'placeholder'; const isDecision = d.data.data.type === 'decision'; const isEndState = d.data.data.isEndState; if (isPlaceholder) { el.append("rect").attr("x", -60).attr("y", -20).attr("width", 120).attr("height", 40).attr("rx", 6).attr("fill", "#f1f5f9").attr("stroke", "#94a3b8").attr("stroke-width", 2).attr("stroke-dasharray", "4,4"); el.append("text").attr("dy", "5px").attr("text-anchor", "middle").text("Undefined Path").attr("font-size", "11px").attr("fill", "#64748b").attr("font-style", "italic"); } else if (isDecision) { const colors = theme.decision; el.append("polygon").attr("points", "0,-40 60,0 0,40 -60,0").attr("fill", colors.bg).attr("stroke", colors.border).attr("stroke-width", 2); 
        const actionText = d.data.data.action || "Step"; 
        el.append("text").attr("dy", "-5px").attr("text-anchor", "middle").text(actionText.substring(0, 20) + (actionText.length > 20 ? "..." : "")).attr("font-size", "12px").attr("font-weight", "bold").attr("fill", colors.text); el.append("text").attr("dy", "15px").attr("text-anchor", "middle").text(d.data.data.role || "Decision Gate").attr("font-size", "10px").attr("fill", colors.text).attr("opacity", 0.8); } else { const colors = isEndState ? theme.endState : theme.process; el.append("rect").attr("x", -90).attr("y", -30).attr("width", 180).attr("height", 60).attr("rx", 6).attr("fill", colors.bg).attr("stroke", colors.border).attr("stroke-width", isEndState ? 3 : 2); if (isEndState) { el.append("circle").attr("cx", 0).attr("cy", -30).attr("r", 8).attr("fill", colors.border); el.append("rect").attr("x", -3).attr("y", -33).attr("width", 6).attr("height", 6).attr("fill", "white"); } 
        const actionText = d.data.data.action || "Step"; 
        el.append("text").attr("dy", "-5px").attr("text-anchor", "middle").text(actionText.substring(0, 25) + (actionText.length > 25 ? "..." : "")).attr("font-size", "12px").attr("font-weight", "bold").attr("fill", colors.text); el.append("text").attr("dy", "15px").attr("text-anchor", "middle").text(d.data.data.role || "").attr("font-size", "10px").attr("fill", colors.text).attr("opacity", 0.7); } });
    }, [root, orientation, theme]);

    const handleExport = () => { if (!svgRef.current) return; const cleanTitle = (title || 'Process').replace(/[^a-z0-9]/gi, '_').substring(0, 30); const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); const filename = `Process-${cleanTitle}-${timestamp}.png`; const bounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY }; exportSvgToPng(svgRef.current, bounds, filename, 60); };

    return <div ref={wrapperRef} className="w-full h-full overflow-hidden flex justify-center relative cursor-move" style={{ backgroundColor: theme.canvasBg }}><svg ref={svgRef} className="w-full h-full"><g ref={gRef} /></svg><div className="absolute bottom-4 left-4 flex gap-2"><button onClick={() => { d3.select(svgRef.current as any).transition().call(d3.zoom().scaleBy as any, 1.2) }} className="p-2 bg-white shadow rounded hover:bg-slate-50"><ZoomIn size={16}/></button><button onClick={() => { d3.select(svgRef.current as any).transition().call(d3.zoom().scaleBy as any, 0.8) }} className="p-2 bg-white shadow rounded hover:bg-slate-50"><ZoomOut size={16}/></button></div><div className="absolute bottom-4 right-4 flex gap-2 items-end opacity-50 pointer-events-none"><SesarLogo className="h-8 w-auto grayscale" /></div><button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow ml-2 pointer-events-auto hover:bg-slate-800" title="Export High-Res PNG"><Download size={16} /></button></div>;
};

// --- Helper Functions for Mermaid Generators ---
const generateSwimlanes = (steps: ProcessStep[]): string => {
    let code = "graph TD\n";
    const roles = new Map<string, ProcessStep[]>();
    
    // Group by Role
    steps.forEach(s => {
        const r = s.role || 'Unassigned';
        if (!roles.has(r)) roles.set(r, []);
        roles.get(r)?.push(s);
    });
    
    // Render Subgraphs
    roles.forEach((roleSteps, role) => {
        // Sanitize role for ID, keep original for label
        code += `    subgraph ${role.replace(/[^a-zA-Z0-9]/g, '_')} ["${role}"]\n`;
        roleSteps.forEach(s => {
            const nodeId = `step${s.stepNumber}`;
            const label = (s.action || "Step").replace(/"/g, "'");
            // CRITICAL FIX: Wrap label in quotes to handle special characters like (), [], &
            if (s.type === 'decision') {
                code += `    ${nodeId}{"${label}"}\n`; 
            } else {
                code += `    ${nodeId}["${label}"]\n`; 
            }
        });
        code += `    end\n`;
    });
    
    // Edges
    steps.forEach(s => {
        const sourceId = `step${s.stepNumber}`;
        if (s.type === 'decision' && s.branches) {
            s.branches.forEach(b => {
                // 1. Try match by ID (UUID)
                let t = steps.find(n => n.id === b.targetStepId);
                
                // 2. Try match by direct step reference (e.g., "step9") if manual entry
                if (!t && b.targetStepId && b.targetStepId.startsWith('step')) {
                    const targetNum = parseInt(b.targetStepId.replace('step', ''));
                    if (!isNaN(targetNum)) {
                        t = steps.find(n => n.stepNumber === targetNum);
                    }
                }

                if (t) {
                    const targetId = `step${t.stepNumber}`;
                    const edgeLabel = (b.label || '').replace(/"/g, "'");
                    code += `    ${sourceId} -->|"${edgeLabel}"| ${targetId}\n`;
                }
            });
        } else if (!s.isEndState) {
             const next = steps.find(n => Number(n.stepNumber) === Number(s.stepNumber) + 1);
             if (next) {
                 const targetId = `step${next.stepNumber}`;
                 code += `    ${sourceId} --> ${targetId}\n`;
             }
        }
    });
    
    return code;
};

const generateSequence = (steps: ProcessStep[]): string => {
    let code = "sequenceDiagram\n";
    const sorted = [...steps].sort((a,b) => Number(a.stepNumber) - Number(b.stepNumber));
    const roles = Array.from(new Set(steps.map(s => (s.role || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_'))));
    roles.forEach(r => code += `    participant ${r}\n`);
    
    sorted.forEach((s, i) => {
        const actor = (s.role || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_');
        const next = sorted[i+1];
        // If next step exists, send message to next actor. If not (end), self-message.
        const nextActor = next ? (next.role || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_') : actor;
        
        const label = (s.action || "Action").replace(/[:;]/g, ' ');
        
        if (s.type === 'decision') {
             code += `    Note over ${actor}: Decision: ${label}\n`;
             if (s.branches) {
                 s.branches.forEach(b => {
                     const t = steps.find(st => st.id === b.targetStepId);
                     if (t) {
                         const tActor = (t.role || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_');
                         code += `    ${actor}->>${tActor}: Option: ${b.label}\n`;
                     }
                 });
             }
        } else {
             code += `    ${actor}->>${nextActor}: Step ${s.stepNumber}: ${label}\n`;
        }
    });
    return code;
};

// --- Generator for Text View (Markdown) ---
const generateProcessMarkdown = (title: string, steps: ProcessStep[]): string => {
    const sorted = [...steps].sort((a,b) => Number(a.stepNumber) - Number(b.stepNumber));
    
    let md = `# Process: ${title}\n\n`;
    
    sorted.forEach(s => {
        const icon = s.type === 'decision' ? '❓' : s.isEndState ? '🏁' : '🔹';
        md += `### ${icon} Step ${s.stepNumber}: ${s.action}\n`;
        md += `**Role:** ${s.role || 'Unassigned'}\n\n`;
        md += `${s.description}\n\n`;
        
        if (s.type === 'decision' && s.branches && s.branches.length > 0) {
            md += `**Decision Branches:**\n`;
            s.branches.forEach(b => {
                const target = steps.find(t => t.id === b.targetStepId);
                const targetLabel = target ? `Step ${target.stepNumber} (${target.action})` : 'End/Unknown';
                md += `- **If ${b.label}** → Go to ${targetLabel}\n`;
            });
            md += `\n`;
        }
        
        md += `---\n\n`;
    });
    
    return md;
};

// --- Step List Editor (GUI) ---
const StepListEditor: React.FC<{ steps: ProcessStep[], onChange: (steps: ProcessStep[]) => void }> = ({ steps, onChange }) => {
    const [selectedId, setSelectedId] = useState<string | null>(steps.length > 0 ? steps[0].id : null);
    
    const selectedStep = steps.find(s => s.id === selectedId);

    const updateStep = (id: string, updates: Partial<ProcessStep>) => {
        const newSteps = steps.map(s => s.id === id ? { ...s, ...updates } : s);
        onChange(newSteps);
    };

    const addStep = () => {
        const maxNum = steps.reduce((max, s) => Math.max(max, Number(s.stepNumber) || 0), 0);
        const newStep: ProcessStep = {
            id: crypto.randomUUID(),
            stepNumber: maxNum + 1,
            type: 'action',
            action: 'New Step',
            description: '',
            role: 'User'
        };
        onChange([...steps, newStep]);
        setSelectedId(newStep.id);
    };

    const deleteStep = (id: string) => {
        const newSteps = steps.filter(s => s.id !== id);
        onChange(newSteps);
        if (selectedId === id && newSteps.length > 0) setSelectedId(newSteps[0].id);
    };

    // Branch Helpers
    const addBranch = () => {
        if (!selectedStep) return;
        const newBranch: ProcessBranch = {
            id: crypto.randomUUID(),
            label: "New Option",
            targetStepId: undefined
        };
        const updatedBranches = [...(selectedStep.branches || []), newBranch];
        updateStep(selectedStep.id, { branches: updatedBranches });
    };

    const updateBranch = (index: number, updates: Partial<ProcessBranch>) => {
        if (!selectedStep || !selectedStep.branches) return;
        const updatedBranches = [...selectedStep.branches];
        updatedBranches[index] = { ...updatedBranches[index], ...updates };
        updateStep(selectedStep.id, { branches: updatedBranches });
    };

    const removeBranch = (index: number) => {
        if (!selectedStep || !selectedStep.branches) return;
        const updatedBranches = selectedStep.branches.filter((_, i) => i !== index);
        updateStep(selectedStep.id, { branches: updatedBranches });
    };

    return (
        <div className="flex h-full border border-slate-200 rounded-lg overflow-hidden bg-white">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100">
                    <h4 className="text-xs font-bold text-slate-600 uppercase">Steps</h4>
                    <button onClick={addStep} className="p-1 hover:bg-slate-200 rounded text-blue-600"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {steps.sort((a,b) => a.stepNumber - b.stepNumber).map(step => (
                        <div 
                            key={step.id} 
                            onClick={() => setSelectedId(step.id)}
                            className={`p-3 border-b border-slate-100 cursor-pointer flex items-center justify-between group ${selectedId === step.id ? 'bg-white border-l-4 border-l-blue-500' : 'hover:bg-slate-100 border-l-4 border-l-transparent'}`}
                        >
                            <div className="truncate pr-2">
                                <div className="text-xs font-bold text-slate-500 mb-0.5">Step {step.stepNumber}</div>
                                <div className="text-sm font-semibold text-slate-800 truncate">{step.action || 'Untitled'}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Form Area */}
            <div className="flex-1 p-6 overflow-y-auto">
                {selectedStep ? (
                    <div className="space-y-4 max-w-lg">
                        <div className="flex gap-4">
                            <div className="w-24">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Number</label>
                                <input 
                                    type="number" 
                                    value={selectedStep.stepNumber} 
                                    onChange={(e) => updateStep(selectedStep.id, { stepNumber: parseInt(e.target.value) })}
                                    className="w-full p-2 border rounded text-sm font-mono"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Action Title</label>
                                <input 
                                    value={selectedStep.action} 
                                    onChange={(e) => updateStep(selectedStep.id, { action: e.target.value })}
                                    className="w-full p-2 border rounded text-sm font-semibold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                <select 
                                    value={selectedStep.type} 
                                    onChange={(e) => updateStep(selectedStep.id, { type: e.target.value as any })}
                                    className="w-full p-2 border rounded text-sm bg-white"
                                >
                                    <option value="action">Action</option>
                                    <option value="decision">Decision</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role / Actor</label>
                                <input 
                                    value={selectedStep.role || ''} 
                                    onChange={(e) => updateStep(selectedStep.id, { role: e.target.value })}
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="e.g. User, System"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                            <textarea 
                                value={selectedStep.description} 
                                onChange={(e) => updateStep(selectedStep.id, { description: e.target.value })}
                                className="w-full p-3 border rounded text-sm h-32 resize-none leading-relaxed"
                            />
                        </div>
                        
                        {/* Decision Branches Editor - ADDED THIS BLOCK */}
                        {selectedStep.type === 'decision' && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-bold text-orange-800 uppercase">Decision Branches</h5>
                                    <button onClick={addBranch} className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-1 rounded hover:bg-orange-100">+ Add Option</button>
                                </div>
                                <div className="space-y-2">
                                    {(selectedStep.branches || []).map((branch, idx) => (
                                        <div key={branch.id || idx} className="flex gap-2 items-center">
                                            <input 
                                                value={branch.label} 
                                                onChange={(e) => updateBranch(idx, { label: e.target.value })}
                                                placeholder="Condition (e.g. Yes)"
                                                className="flex-1 p-1.5 text-xs border border-orange-200 rounded"
                                            />
                                            <span className="text-[10px] text-orange-400">→</span>
                                            <select
                                                value={branch.targetStepId || ''}
                                                onChange={(e) => updateBranch(idx, { targetStepId: e.target.value })}
                                                className="flex-1 p-1.5 text-xs border border-orange-200 rounded bg-white"
                                            >
                                                <option value="">(End / Next)</option>
                                                {steps.filter(s => s.id !== selectedStep.id).sort((a,b) => a.stepNumber - b.stepNumber).map(s => (
                                                    <option key={s.id} value={s.id}>Step {s.stepNumber}: {s.action}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => removeBranch(idx)} className="text-orange-400 hover:text-orange-600"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {(!selectedStep.branches || selectedStep.branches.length === 0) && (
                                        <p className="text-[10px] text-orange-400 italic text-center py-2">No branches defined. Flow will continue to next step implicitly.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="endState"
                                checked={selectedStep.isEndState || false} 
                                onChange={(e) => updateStep(selectedStep.id, { isEndState: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <label htmlFor="endState" className="text-sm text-slate-700 font-medium">This is a terminal step (End State)</label>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Play size={48} className="mb-4 opacity-20" />
                        <p>Select a step to edit or add a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Data Normalization Helper
const normalizeProcessData = (data: any[]): ProcessStep[] => {
    if (!Array.isArray(data)) return [];
    
    return data.map((item, index) => {
        // Safe Key Access with fallbacks
        const id = item.id || crypto.randomUUID();
        const stepNumber = Number(item.stepNumber || item.step_number || index + 1);
        const action = item.action || item.step_title || item.title || "Step";
        
        let description = item.description || "";
        // If inputs/outputs exist in raw data but not description, append them
        if (item.inputs && Array.isArray(item.inputs)) {
            description += `\n\n**Inputs:** ${item.inputs.join(', ')}`;
        }
        if (item.outputs && Array.isArray(item.outputs)) {
            description += `\n**Outputs:** ${item.outputs.join(', ')}`;
        }

        const role = item.role || "User"; // Default
        const type = (item.type === 'decision' || item.type === 'action') ? item.type : 'action';
        
        return {
            id,
            stepNumber,
            action,
            description,
            role,
            type,
            branches: item.branches || [],
            isEndState: !!item.isEndState
        } as ProcessStep;
    });
};

// --- Process Modal ---
interface ProcessModalProps {
    title: string;
    steps: ProcessStep[];
    isLocked: boolean;
    startEditing?: boolean;
    theme: AppTheme;
    history?: ContentVersion[];
    challenges?: ChallengeEntry[];
    onToggleLock: () => void;
    onSave: (steps: ProcessStep[]) => void;
    onRefine?: (guidance: string) => void;
    onChallenge?: (text: string) => Promise<void>;
    onGenerateCritiques?: (count: number) => Promise<string[]>; // NEW
    onClose: () => void;
}

export const ProcessModal: React.FC<ProcessModalProps> = ({ title, steps, isLocked, startEditing, theme, history = [], challenges = [], onToggleLock, onSave, onRefine, onChallenge, onGenerateCritiques, onClose }) => {
    // Initialize state with normalized data
    const [localSteps, setLocalSteps] = useState<ProcessStep[]>(normalizeProcessData(steps));
    
    const [viewMode, setViewMode] = useState<'visual' | 'swimlane' | 'sequence' | 'editor' | 'json' | 'text'>('visual');
    const [jsonContent, setJsonContent] = useState(JSON.stringify(localSteps, null, 2));
    const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
    const [isRefining, setIsRefining] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'challenges' | 'history'>('content');

    // Sync if props change (external update)
    useEffect(() => {
        const normalized = normalizeProcessData(steps);
        setLocalSteps(normalized);
        setJsonContent(JSON.stringify(normalized, null, 2));
    }, [steps]);

    useEffect(() => { 
        if (startEditing) setViewMode('editor'); 
    }, [startEditing]);

    const handleStepUpdate = (newSteps: ProcessStep[]) => {
        setLocalSteps(newSteps);
        setJsonContent(JSON.stringify(newSteps, null, 2));
    };

    const handleJsonUpdate = (val: string) => {
        setJsonContent(val);
        try {
            const parsed = JSON.parse(val);
            if(Array.isArray(parsed)) setLocalSteps(normalizeProcessData(parsed));
        } catch(e) {
            // Ignore parse errors while typing
        }
    };

    return (
        <ModalBase 
            title={`Process: ${title}`} 
            onClose={onClose}
            headerAction={
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                        <button onClick={() => setActiveTab('content')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'content' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Content</button>
                        <button onClick={() => setActiveTab('challenges')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'challenges' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Challenges ({challenges.length})</button>
                        <button onClick={() => setActiveTab('history')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'history' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
                    </div>

                    {activeTab === 'content' && (
                        <>
                            <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
                                <button onClick={() => setViewMode('visual')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'visual' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Tree Flowchart"><GitBranch size={12}/> Flow</button>
                                <button onClick={() => setViewMode('swimlane')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'swimlane' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Swimlane Diagram"><Rows size={12}/> Swimlanes</button>
                                <button onClick={() => setViewMode('sequence')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'sequence' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Sequence Diagram"><ListOrdered size={12}/> Sequence</button>
                                <button onClick={() => setViewMode('text')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'text' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Markdown Text"><FileText size={12}/> Text</button>
                                <button onClick={() => setViewMode('editor')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'editor' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`} title="GUI Builder"><Edit size={12}/> Builder</button>
                                <button onClick={() => setViewMode('json')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${viewMode === 'json' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`} title="Raw JSON"><Code size={12}/> JSON</button>
                            </div>

                            {onRefine && (
                                <button 
                                    onClick={() => setIsRefining(true)} 
                                    className="p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                                    title="Refine with AI"
                                >
                                    <Sparkles size={16} /> Refine
                                </button>
                            )}
                            
                            <button onClick={onToggleLock} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isLocked ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-600'}`} title={isLocked ? "Unlock to Edit" : "Lock Content"}>
                                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                            
                            {!isLocked && (
                                <button onClick={() => onSave(localSteps)} className="p-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                            )}
                        </>
                    )}
                </div>
            }
        >
            <div className="h-full relative">
                {isRefining && onRefine && (
                    <RefineInput onRefine={(g) => { onRefine(g); setIsRefining(false); }} onCancel={() => setIsRefining(false)} />
                )}

                {activeTab === 'content' && (
                    <>
                        {viewMode === 'visual' && (
                            <div className="w-full h-full relative">
                                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow border border-slate-200 flex p-1">
                                    <button onClick={() => setOrientation('vertical')} className={`p-1.5 rounded ${orientation === 'vertical' ? 'bg-slate-200' : 'hover:bg-slate-100'}`} title="Vertical Layout"><RectangleVertical size={16} className="text-slate-600"/></button>
                                    <button onClick={() => setOrientation('horizontal')} className={`p-1.5 rounded ${orientation === 'horizontal' ? 'bg-slate-200' : 'hover:bg-slate-100'}`} title="Horizontal Layout"><RectangleHorizontal size={16} className="text-slate-600"/></button>
                                </div>
                                <ProcessFlowChart steps={localSteps} orientation={orientation} title={title} theme={theme} />
                            </div>
                        )}
                        
                        {viewMode === 'swimlane' && (
                            <div className="w-full h-full p-4 overflow-auto flex items-center justify-center bg-slate-50/50">
                                <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                    <MermaidViewer code={generateSwimlanes(localSteps)} title={`${title}_Swimlanes`} />
                                </div>
                            </div>
                        )}

                        {viewMode === 'sequence' && (
                            <div className="w-full h-full p-4 overflow-auto flex items-center justify-center bg-slate-50/50">
                                <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                    <MermaidViewer code={generateSequence(localSteps)} title={`${title}_Sequence`} />
                                </div>
                            </div>
                        )}

                        {viewMode === 'text' && (
                            <div className="w-full h-full p-8 overflow-auto bg-white">
                                <div className="prose prose-sm max-w-3xl mx-auto text-slate-700">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {generateProcessMarkdown(title, localSteps)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {viewMode === 'editor' && (
                            <div className="w-full h-full p-4 bg-slate-50">
                                <StepListEditor steps={localSteps} onChange={handleStepUpdate} />
                            </div>
                        )}

                        {viewMode === 'json' && (
                            <div className="w-full h-full p-0 flex flex-col">
                                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 text-xs text-amber-800 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    Editing raw JSON structure.
                                </div>
                                <textarea 
                                    value={jsonContent}
                                    onChange={(e) => handleJsonUpdate(e.target.value)}
                                    className="flex-1 w-full p-4 font-mono text-xs outline-none resize-none bg-slate-50"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'challenges' && onChallenge && onRefine && (
                    <ChallengesPanel 
                        challenges={challenges} 
                        onChallenge={onChallenge} 
                        onGenerateCritiques={onGenerateCritiques}
                        onApplyUpdate={(guidance) => {
                            onRefine(guidance);
                            setActiveTab('content');
                        }} 
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryPanel 
                        history={history} 
                        type="process" 
                        onRestore={(v) => { 
                            onSave(v.content as ProcessStep[]); 
                            setActiveTab('content'); 
                        }} 
                    />
                )}
            </div>
        </ModalBase>
    );
};

// --- Info Modal ---
export const InfoModal: React.FC<{ title: string, content: string, onClose: () => void }> = ({ title, content, onClose }) => (
    <ModalBase title={title} onClose={onClose}>
        <div className="h-full overflow-y-auto p-8 bg-white">
             <div className="prose prose-sm max-w-3xl mx-auto text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
             </div>
        </div>
    </ModalBase>
);

// --- History Modal (App Level) ---
export const HistoryModal: React.FC<{ 
    history: { description: string, timestamp: number }[], 
    currentIndex: number, 
    onRestore: (index: number) => void, 
    onClose: () => void 
}> = ({ history, currentIndex, onRestore, onClose }) => {
    return (
        <ModalBase title="Session History" onClose={onClose}>
             <div className="h-full overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-2xl mx-auto space-y-4">
                    {history.length === 0 && <p className="text-center text-slate-400">No history recorded.</p>}
                    {history.map((entry, index) => (
                        <div key={index} className={`p-4 rounded-xl border flex justify-between items-center ${index === currentIndex ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                             <div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-sm font-bold text-slate-700">{entry.description}</span>
                                     {index === currentIndex && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Current</span>}
                                 </div>
                                 <p className="text-xs text-slate-400 mt-1">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                             </div>
                             {index !== currentIndex && (
                                 <button onClick={() => { onRestore(index); onClose(); }} className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                     Restore
                                 </button>
                             )}
                        </div>
                    )).reverse()}
                </div>
             </div>
        </ModalBase>
    );
};

// --- Log Modal ---
export const LogModal: React.FC<{ logs: LogEntry[], onClose: () => void }> = ({ logs, onClose }) => {
    return (
        <ModalBase title="System Logs" onClose={onClose}>
            <div className="h-full overflow-y-auto p-4 bg-slate-900 text-slate-300 font-mono text-xs">
                 {logs.length === 0 && <p className="text-slate-600">No logs generated.</p>}
                 {logs.map((log) => (
                     <div key={log.id} className="mb-2 border-b border-slate-800 pb-2">
                         <div className="flex gap-2">
                             <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                             <span className={`font-bold ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : log.level === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
                                 [{log.level.toUpperCase()}]
                             </span>
                             <span>{log.message}</span>
                         </div>
                         {log.details && (
                             <pre className="mt-1 ml-6 text-slate-500 overflow-x-auto">
                                 {JSON.stringify(log.details, null, 2)}
                             </pre>
                         )}
                     </div>
                 )).reverse()}
            </div>
        </ModalBase>
    );
};

// --- Rename Modal ---
export const RenameModal: React.FC<{ currentName: string, onRename: (name: string) => void, onClose: () => void }> = ({ currentName, onRename, onClose }) => {
    const [name, setName] = useState(currentName);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onRename(name);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <PenLine size={20} className="text-slate-600"/> Rename Session
                 </h3>
                 <form onSubmit={handleSubmit}>
                     <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                     />
                     <div className="flex gap-2">
                         <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                         <button type="submit" disabled={!name.trim()} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                     </div>
                 </form>
             </div>
        </div>
    );
};
