
import React, { useState } from 'react';
import { X, Book, Plus, Trash2, Link, Bot, Search, Loader2, Check, ArrowRight } from 'lucide-react';
import { Reference, MindMapData } from '../types';

interface ReferenceModalProps {
  node: MindMapData | null; // Null if global library view
  references: Reference[];
  onAdd: (ref: Reference) => void;
  onDelete: (id: string) => void;
  onAttach: (nodeId: string, refId: string) => void;
  onDetach: (nodeId: string, refId: string) => void;
  onGenerate: (context: string) => Promise<Reference[]>;
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({ 
    node, references, onAdd, onDelete, onAttach, onDetach, onGenerate, onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'attached' | 'library' | 'generate'>(node ? 'attached' : 'library');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  
  // AI Candidates
  const [generatedCandidates, setGeneratedCandidates] = useState<Reference[]>([]);
  
  // New Reference Form State
  const [newRef, setNewRef] = useState<Partial<Reference>>({ citation: '', description: '', url: '' });

  const attachedRefs = node ? references.filter(r => node.referenceIds?.includes(r.id)) : [];
  const libraryRefs = references.filter(r => 
      r.citation.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
      if (!newRef.citation) return;
      const ref: Reference = {
          id: crypto.randomUUID(),
          citation: newRef.citation,
          description: newRef.description,
          url: newRef.url,
          source: 'user'
      };
      onAdd(ref);
      if (node) onAttach(node.id, ref.id);
      setNewRef({ citation: '', description: '', url: '' });
      if(node) setActiveTab('attached');
  };

  const handleGenerate = async () => {
      if (!generatePrompt.trim()) return;
      setIsGenerating(true);
      setGeneratedCandidates([]); // Clear previous
      try {
          const newRefs = await onGenerate(generatePrompt);
          setGeneratedCandidates(newRefs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAddCandidate = (ref: Reference) => {
      onAdd(ref);
      if (node) onAttach(node.id, ref.id);
      // Remove from candidate list to show it's done
      setGeneratedCandidates(prev => prev.filter(r => r.id !== ref.id));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Book size={20} className="text-indigo-600" /> 
                        {node ? `References: ${node.label}` : 'Global Reference Library'}
                    </h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <div className="flex border-b border-slate-200 bg-white shrink-0">
                {node && (
                    <button 
                        onClick={() => setActiveTab('attached')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attached' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                    >
                        Attached ({attachedRefs.length})
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'library' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    Full Library ({references.length})
                </button>
                <button 
                    onClick={() => setActiveTab('generate')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'generate' ? 'border-purple-600 text-purple-600 bg-purple-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    <Bot size={14} className="inline mr-1" /> AI Suggest
                </button>
            </div>

            {/* Main Content Area - Use flex column and overflow handling per tab */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 relative">
                
                {/* ATTACHED TAB */}
                {activeTab === 'attached' && node && (
                    <div className="absolute inset-0 overflow-y-auto p-4">
                        <div className="space-y-3">
                            {attachedRefs.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 italic">
                                    No references attached to this node yet.
                                </div>
                            ) : (
                                attachedRefs.map(ref => (
                                    <div key={ref.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-bold px-1.5 rounded ${ref.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{ref.source}</span>
                                                <p className="text-sm font-bold text-slate-800">{ref.citation}</p>
                                            </div>
                                            <button onClick={() => onDetach(node.id, ref.id)} className="text-red-400 hover:text-red-600 p-1" title="Detach"><X size={14}/></button>
                                        </div>
                                        {ref.description && <p className="text-xs text-slate-500 mt-1">{ref.description}</p>}
                                        {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"><Link size={10}/> View Source</a>}
                                    </div>
                                ))
                            )}
                            <button onClick={() => setActiveTab('library')} className="w-full py-2 bg-white border border-dashed border-slate-300 text-slate-500 text-sm font-medium rounded-lg hover:border-indigo-400 hover:text-indigo-600 mt-4">
                                + Attach from Library or Create New
                            </button>
                        </div>
                    </div>
                )}

                {/* LIBRARY TAB */}
                {activeTab === 'library' && (
                    <div className="absolute inset-0 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {/* Add New Form */}
                            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2">Create New Reference</h4>
                                <input value={newRef.citation} onChange={e => setNewRef({...newRef, citation: e.target.value})} placeholder="Citation (Author, Date, Title)..." className="w-full text-sm border p-2 rounded mb-2 outline-none focus:border-indigo-400" />
                                <input value={newRef.description} onChange={e => setNewRef({...newRef, description: e.target.value})} placeholder="Brief Description / Relevance..." className="w-full text-sm border p-2 rounded mb-2 outline-none focus:border-indigo-400" />
                                <div className="flex gap-2">
                                    <input value={newRef.url} onChange={e => setNewRef({...newRef, url: e.target.value})} placeholder="URL (optional)..." className="flex-1 text-sm border p-2 rounded outline-none focus:border-indigo-400" />
                                    <button onClick={handleCreate} disabled={!newRef.citation} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">Add</button>
                                </div>
                            </div>

                            {/* Search & List */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search library..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100" />
                            </div>

                            <div className="space-y-2">
                                {libraryRefs.map(ref => {
                                    const isAttached = node?.referenceIds?.includes(ref.id);
                                    return (
                                        <div key={ref.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-start group hover:border-indigo-200 transition-colors">
                                            <div className="flex-1 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 rounded ${ref.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{ref.source}</span>
                                                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{ref.citation}</p>
                                                </div>
                                                {ref.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ref.description}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {node && (
                                                    <button 
                                                        onClick={() => isAttached ? onDetach(node.id, ref.id) : onAttach(node.id, ref.id)}
                                                        className={`text-xs px-2 py-1 rounded font-bold transition-colors ${isAttached ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                    >
                                                        {isAttached ? 'Attached' : 'Attach'}
                                                    </button>
                                                )}
                                                <button onClick={() => onDelete(ref.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* GENERATE TAB */}
                {activeTab === 'generate' && (
                    <div className="absolute inset-0 flex flex-col p-4">
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4 shrink-0 shadow-sm">
                            <div className="flex gap-3 mb-3">
                                <div className="p-2 bg-white rounded-full text-purple-600 shadow-sm h-fit"><Bot size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">AI Reference Librarian</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {node 
                                            ? <span>I can suggest standard academic sources relevant to <strong>"{node.label}"</strong>.</span>
                                            : <span>I can suggest sources relevant to your <strong>Thesis Topic</strong>.</span>
                                        }
                                    </p>
                                </div>
                            </div>
                            <textarea 
                                value={generatePrompt}
                                onChange={e => setGeneratePrompt(e.target.value)}
                                placeholder="e.g. Focus on papers from 2020-2024 regarding security protocols..."
                                className="w-full h-16 p-3 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-3 bg-white"
                            />
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || !generatePrompt.trim()}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                {isGenerating ? 'Searching...' : 'Find References'}
                            </button>
                        </div>

                        {/* Candidate List (Scrollable Area) */}
                        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 pb-4">
                            {generatedCandidates.length > 0 && (
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-slate-50/95 py-2 z-10 backdrop-blur-sm">
                                    Proposed Sources <span className="bg-slate-200 px-1.5 rounded-full text-slate-600">{generatedCandidates.length}</span>
                                </h4>
                            )}
                            
                            {generatedCandidates.map(ref => (
                                <div key={ref.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm hover:border-purple-300 transition-all group animate-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800">{ref.citation}</p>
                                            <p className="text-xs text-slate-600 mt-1">{ref.description}</p>
                                            {ref.url && <a href={ref.url} className="text-xs text-blue-500 hover:underline block mt-1 truncate max-w-full">{ref.url}</a>}
                                        </div>
                                        <button 
                                            onClick={() => handleAddCandidate(ref)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-sm flex items-center gap-1 text-xs font-bold shrink-0"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {!isGenerating && generatedCandidates.length === 0 && (
                                <div className="text-center py-10 flex flex-col items-center text-slate-400 gap-2">
                                    <Search size={32} className="opacity-20" />
                                    <p className="text-sm">Enter a prompt above to discover academic sources.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};
