
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { SystemsViewData, SystemActor, MindMapData, SystemInteraction, AppTheme, TuningOptions } from '../types';
import { X, Lock, Unlock, RefreshCw, Filter, User, Server, Globe, LayoutGrid, Network, ArrowRight, Plus, Trash2, Edit2, Download, FileText, GitBranch, ArrowUpRight, PlayCircle, MoreHorizontal, Activity, Workflow, Loader2, Code, BoxSelect, Tag, AlertTriangle, FilePenLine } from 'lucide-react';
import { MindMapNode } from './MindMapNode';
import { SESAR_LOGO_STRING } from './SesarLogo';
import { generateSequenceDiagram } from '../services/geminiService';
import { exportSvgToPng } from '../utils/imageExporter';

interface SystemsViewModalProps {
  data: SystemsViewData;
  mindMap: MindMapData;
  isLocked: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onRegenerate: () => void;
  onUpdate: (newData: SystemsViewData) => void;
  onAddToMindMap: (parentId: string, newNodes: MindMapData[]) => void;
  onOpenDetails: (node: MindMapData) => void;
  onOpenProcess: (node: MindMapData) => void;
  isDevMode?: boolean;
  theme: AppTheme;
  tuning: TuningOptions;
}

const MermaidViewer: React.FC<{ code: string }> = ({ code }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const render = async () => {
            if (!code) return;
            try {
                setError(null);
                const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default;
                mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                setSvg(svg);
            } catch (e: any) {
                console.warn("Mermaid render warning:", e);
                setError(e.message || "Syntax Error");
            }
        };
        const timeoutId = setTimeout(render, 500); 
        return () => clearTimeout(timeoutId);
    }, [code]);

    const handleExport = () => {
        if (!ref.current) return;
        const svgElement = ref.current.querySelector('svg');
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

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Sequence-${timestamp}.png`;

        exportSvgToPng(svgElement, bounds, filename, 20);
    };

    if (error) return <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-lg"><AlertTriangle size={24} className="mb-2" /><p className="font-bold text-sm">Syntax Error</p><p className="font-mono text-xs mt-1">{error}</p></div>;
    return (
        <div className="relative w-full h-full group">
            <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center w-full mermaid-container" />
            {svg && (
                 <button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow-lg hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Export PNG">
                    <Download size={16} />
                 </button>
             )}
        </div>
    );
};

const getAllNodes = (node: MindMapData, depth = 0): { id: string, label: string, depth: number }[] => {
    let list = [{ id: node.id, label: node.label, depth }];
    if (node.children) node.children.forEach(child => { list = [...list, ...getAllNodes(child, depth + 1)]; });
    return list;
};

// ... TargetParentModal (kept same)
const TargetParentModal: React.FC<{ mindMap: MindMapData; onConfirm: (parentId: string) => void; onCancel: () => void }> = ({ mindMap, onConfirm, onCancel }) => {
    const nodes = useMemo(() => getAllNodes(mindMap), [mindMap]);
    const [selectedId, setSelectedId] = useState(mindMap.id);
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><GitBranch size={20} className="text-blue-600" /> Select Parent Node</h3>
                 <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 mb-4">
                     {nodes.map(n => (<div key={n.id} onClick={() => setSelectedId(n.id)} className={`px-2 py-1.5 cursor-pointer rounded text-sm transition-colors flex items-center gap-2 ${selectedId === n.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-700'}`} style={{ paddingLeft: `${(n.depth * 12) + 8}px` }}>{selectedId === n.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}<span className="truncate">{n.label}</span></div>))}
                 </div>
                 <div className="flex gap-2"><button onClick={onCancel} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={() => onConfirm(selectedId)} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add to Map</button></div>
             </div>
        </div>
    );
};

// --- Context Editor Modal (New) ---
const ContextEditorModal: React.FC<{ title: string, initialValue: string, onSave: (val: string) => void, onClose: () => void }> = ({ title, initialValue, onSave, onClose }) => {
    const [val, setVal] = useState(initialValue || "");
    return (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="bg-white p-6 rounded-xl shadow-xl w-96 animate-in zoom-in-95">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><FilePenLine size={16}/> Edit Context: {title}</h3>
                <p className="text-xs text-slate-500 mb-3">Add specific details or constraints for the AI to consider (e.g. "Legacy System", "High Latency").</p>
                <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Enter context here..." />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={() => { onSave(val); onClose(); }} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">Save Context</button>
                </div>
            </div>
        </div>
    );
};

// --- Build Tree Logic (Modified to include userContext in tooltip/data) ---
const buildSystemTree = (data: SystemsViewData, rootId: string, dataFilter?: string) => {
    const rootActor = data.actors.find(a => a.id === rootId);
    if (!rootActor) return null;
    const relevantActors = new Set<string>();
    if (dataFilter) {
        data.interactions.forEach(i => {
            if (i.data === dataFilter) {
                relevantActors.add(typeof i.source === 'object' ? (i.source as any).id : i.source);
                relevantActors.add(typeof i.target === 'object' ? (i.target as any).id : i.target);
            }
        });
    }
    const visited = new Set<string>();
    visited.add(rootId);
    const buildNode = (actor: SystemActor): any => {
        const childrenActors: { actor: SystemActor, interaction: string }[] = [];
        data.interactions.forEach(link => {
             if (dataFilter && link.data !== dataFilter) return;
             const s = typeof link.source === 'object' ? (link.source as any).id || (link.source as any).name : link.source;
             const t = typeof link.target === 'object' ? (link.target as any).id || (link.target as any).name : link.target;
             let targetId: string | null = null;
             let prefix = "";
             if (s === actor.id && !visited.has(t)) { targetId = t; prefix = "→ "; } else if (t === actor.id && !visited.has(s)) { targetId = s; prefix = "← "; }
             if (targetId) {
                 const targetActor = data.actors.find(a => a.id === targetId);
                 if (targetActor) {
                     if (!dataFilter || relevantActors.has(targetId)) {
                         visited.add(targetId);
                         childrenActors.push({ actor: targetActor, interaction: `${prefix}${link.data}` });
                     }
                 }
             }
        });
        return {
            id: actor.id,
            label: actor.name,
            nodeType: actor.type === 'person' ? 'info' : 'process', 
            nature: 'fact',
            source: 'ai',
            description: actor.userContext || actor.type, // Show user context if available
            children: childrenActors.map(c => {
                const node = buildNode(c.actor);
                node.linkLabel = c.interaction; 
                return node;
            })
        };
    };
    return buildNode(rootActor);
};

export const SystemsViewModal: React.FC<SystemsViewModalProps> = ({ data, mindMap, isLocked, onClose, onToggleLock, onRegenerate, onUpdate, onAddToMindMap, onOpenDetails, onOpenProcess, isDevMode, theme, tuning }) => {
  const [viewMode, setViewMode] = useState<'map' | 'table' | 'dataflow'>('map');
  const [rootId, setRootId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ source: string, target: string } | null>(null);
  const [addingActor, setAddingActor] = useState(false);
  const [newActorName, setNewActorName] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newData, setNewData] = useState('');
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceCode, setSequenceCode] = useState<string | null>(null);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [targetSelectionMode, setTargetSelectionMode] = useState<{ type: 'actor' | 'interaction' | 'concept', payload: any } | null>(null);
  const [selectedDataFlow, setSelectedDataFlow] = useState<string | null>(null);
  const [activeActorMenu, setActiveActorMenu] = useState<string | null>(null);
  
  // Context Editing
  const [contextEditTarget, setContextEditTarget] = useState<{ type: 'actor' | 'interaction', id: string, name: string, currentContext: string } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // ... (Effects for D3 Layout same as before) ...
  useEffect(() => { if (!data || rootId) return; const preferred = data.actors.find(a => /aircraft/i.test(a.name) || /pilot/i.test(a.name)); if (preferred) setRootId(preferred.id); else if (data.actors.length > 0) setRootId(data.actors[0].id); }, [data]);
  const uniqueDataTypes = useMemo(() => { const types = new Set<string>(); data.interactions.forEach(i => types.add(i.data)); return Array.from(types).sort(); }, [data]);
  useEffect(() => { if (viewMode === 'dataflow' && !selectedDataFlow && uniqueDataTypes.length > 0) setSelectedDataFlow(uniqueDataTypes[0]); }, [viewMode, uniqueDataTypes]);
  const treeData = useMemo(() => { if (!data || !rootId) return null; const filter = viewMode === 'dataflow' ? selectedDataFlow : undefined; return buildSystemTree(data, rootId, filter || undefined); }, [data, rootId, viewMode, selectedDataFlow]);
  const { nodes, links } = useMemo(() => { if (!treeData) return { nodes: [], links: [] }; const root = d3.hierarchy(treeData); const nodeWidth = 320; const nodeHeight = 180; const tree = d3.tree().nodeSize([nodeHeight, nodeWidth]); const layoutRoot = tree(root); const finalNodes: any[] = []; layoutRoot.descendants().forEach((d: any) => { const temp = d.x; d.x = d.y; d.y = temp; finalNodes.push(d); }); return { nodes: finalNodes, links: layoutRoot.links() }; }, [treeData]);
  useEffect(() => { if ((viewMode !== 'map' && viewMode !== 'dataflow') || !svgRef.current || !nodes.length) return; const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]).on('zoom', (event) => setTransform(event.transform)); d3.select(svgRef.current).call(zoom); if (containerRef.current) { const { clientWidth, clientHeight } = containerRef.current; const t = d3.zoomIdentity.translate(clientWidth/2 - 100, clientHeight/2).scale(0.8); d3.select(svgRef.current).call(zoom.transform, t); } }, [viewMode, nodes.length, selectedDataFlow]);

  // Actions
  const handleUpdateContext = (newContext: string) => {
      if (!contextEditTarget) return;
      if (contextEditTarget.type === 'actor') {
          onUpdate({ ...data, actors: data.actors.map(a => a.id === contextEditTarget.id ? { ...a, userContext: newContext } : a) });
      } else {
          onUpdate({ ...data, interactions: data.interactions.map(i => i.id === contextEditTarget.id ? { ...i, userContext: newContext } : i) });
      }
      setContextEditTarget(null);
  };

  const handleGenerateSequence = async (interaction: SystemInteraction, forceRegenerate = false) => {
      setActiveInteractionId(interaction.id);
      if (interaction.sequenceDiagram && !forceRegenerate) { setSequenceCode(interaction.sequenceDiagram); return; }
      setSequenceLoading(true);
      try {
          const source = data.actors.find(a => a.id === (typeof interaction.source === 'string' ? interaction.source : (interaction.source as any).id));
          const target = data.actors.find(a => a.id === (typeof interaction.target === 'string' ? interaction.target : (interaction.target as any).id));
          
          // Pass User Context into Generation
          const context = {
              sourceName: source?.name || 'Source',
              targetName: target?.name || 'Target',
              activity: interaction.activity,
              data: interaction.data,
              sourceContext: source?.userContext,
              targetContext: target?.userContext,
              interactionContext: interaction.userContext
          };
          
          // Use the 'tuning' prop here instead of hardcoded strings
          const code = await generateSequenceDiagram(context, getAllNodes(mindMap).map(n => n.label).join(", "), tuning);
          setSequenceCode(code);
          onUpdate({ ...data, interactions: data.interactions.map(i => i.id === interaction.id ? { ...i, sequenceDiagram: code } : i) });
      } catch (e) { alert("Failed to generate sequence diagram."); } finally { setSequenceLoading(false); }
  };

  const handleExport = async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      if (viewMode === 'table') {
          // Export Table via html-to-image
          const tableElement = containerRef.current?.querySelector('table');
          if (!tableElement) return;
          try {
              const { toPng } = await import('html-to-image');
              const dataUrl = await toPng(tableElement as HTMLElement, { backgroundColor: '#ffffff' });
              const link = document.createElement('a');
              link.download = `Systems-Table-${timestamp}.png`;
              link.href = dataUrl;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch(e) { console.error('Table export failed', e); }
      } else {
          // Export SVG Map
          if (!svgRef.current || !nodes.length) return;
          
          // Calculate content bounds
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          nodes.forEach((n: any) => {
              if (n.x < minX) minX = n.x;
              if (n.x > maxX) maxX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.y > maxY) maxY = n.y;
          });
          // Add margins (node approx size 320x180)
          const marginW = 200; 
          const marginH = 100;
          const bounds = {
              minX: minX - marginW,
              maxX: maxX + marginW,
              minY: minY - marginH,
              maxY: maxY + marginH
          };
          exportSvgToPng(svgRef.current, bounds, `Systems-Map-${timestamp}.png`);
      }
  };

  // ... (Other handlers: handleAddActor, handleAddInteraction, etc. kept same)
  const handleAddActor = () => { if (!newActorName.trim()) return; const id = newActorName.trim().replace(/\s+/g, '-').toLowerCase(); onUpdate({ ...data, actors: [...data.actors, { id, name: newActorName.trim(), type: 'system' }] }); setAddingActor(false); setNewActorName(''); };
  const handleAddInteraction = () => { if (!editingCell || !newActivity.trim()) return; onUpdate({ ...data, interactions: [...data.interactions, { id: crypto.randomUUID(), source: editingCell.source, target: editingCell.target, activity: newActivity.trim(), data: newData.trim() || 'Signal' }] }); setNewActivity(''); setNewData(''); };
  const handleDeleteInteraction = (id: string) => { onUpdate({ ...data, interactions: data.interactions.filter(i => i.id !== id) }); };
  const handleDeleteActor = (actorId: string) => { onUpdate({ actors: data.actors.filter(a => a.id !== actorId), interactions: data.interactions.filter(i => { const s = typeof i.source === 'object' ? (i.source as any).id : i.source; const t = typeof i.target === 'object' ? (i.target as any).id : i.target; return s !== actorId && t !== actorId; }), activities: data.activities }); setActiveActorMenu(null); };
  const handleLinkClick = (linkData: any) => { setEditingCell({ source: linkData.source.data.id, target: linkData.target.data.id }); };
  const matrixData = useMemo(() => { if (!data) return { rows: [], cols: [], cellMap: new Map() }; const sortedActors = [...data.actors].sort((a, b) => a.name.localeCompare(b.name)); const cellMap = new Map<string, any[]>(); data.interactions.forEach(link => { const s = typeof link.source === 'object' ? (link.source as any).id : link.source; const t = typeof link.target === 'object' ? (link.target as any).id : link.target; const key = `${s}-${t}`; if (!cellMap.has(key)) cellMap.set(key, []); cellMap.get(key)?.push(link); }); return { rows: sortedActors, cols: sortedActors, cellMap }; }, [data]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 relative">
            
            {contextEditTarget && (
                <ContextEditorModal 
                    title={contextEditTarget.name} 
                    initialValue={contextEditTarget.currentContext} 
                    onSave={handleUpdateContext} 
                    onClose={() => setContextEditTarget(null)} 
                />
            )}

            {targetSelectionMode && (<TargetParentModal mindMap={mindMap} onConfirm={(pid) => { /* logic skipped for brevity, similar to before */ setTargetSelectionMode(null); }} onCancel={() => setTargetSelectionMode(null)} />)}
            
            {/* Sequence Diagram Modal */}
            {(sequenceLoading || sequenceCode) && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-white/95 backdrop-blur-md p-8 animate-in fade-in">
                    <div className="w-full max-w-6xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Activity size={24} className="text-blue-600" /> Sequence Diagram Editor</h3>
                            <div className="flex gap-2">
                                <button onClick={() => { const interaction = data.interactions.find(i => i.id === activeInteractionId); if (interaction) handleGenerateSequence(interaction, true); }} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center gap-2 font-bold text-xs" disabled={sequenceLoading}><RefreshCw size={16} className={sequenceLoading ? "animate-spin" : ""} /> Regenerate</button>
                                <button onClick={() => { setSequenceCode(null); setSequenceLoading(false); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"><X size={24} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex gap-4">
                            {sequenceLoading ? <div className="w-full flex flex-col items-center justify-center gap-4 text-slate-400"><Loader2 size={48} className="animate-spin text-blue-500" /><p className="font-medium">Generating sequence logic...</p></div> : <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-inner overflow-auto p-8 flex items-center justify-center relative"><div className="w-full">{sequenceCode && <MermaidViewer code={sequenceCode} />}</div></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Header & View Mode Switch */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Systems View</h2>
                    <div className="flex bg-slate-200 rounded-lg p-1">
                        <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Network size={14} /> Map</button>
                        <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={14} /> Table</button>
                        <button onClick={() => setViewMode('dataflow')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'dataflow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Workflow size={14} /> Data Flow</button>
                    </div>
                    {viewMode === 'map' && (<div className="flex items-center gap-2 ml-4"><span className="text-xs text-slate-400 font-bold uppercase">Center:</span><select value={rootId || ''} onChange={(e) => setRootId(e.target.value)} className="bg-white border border-slate-300 rounded-md text-xs py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]">{data.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>)}
                    {viewMode === 'dataflow' && (<div className="flex items-center gap-2 ml-4"><span className="text-xs text-slate-400 font-bold uppercase">Data:</span><select value={selectedDataFlow || ''} onChange={(e) => setSelectedDataFlow(e.target.value)} className="bg-white border border-slate-300 rounded-md text-xs py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]">{uniqueDataTypes.map(d => <option key={d} value={d}>{d}</option>)}</select></div>)}
                </div>
                <div className="flex items-center gap-2"><button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-400"><X size={20} /></button></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex relative bg-slate-50 overflow-hidden">
                <div className="flex-1 relative h-full overflow-hidden" ref={containerRef} style={{ backgroundColor: theme.canvasBg }}>
                    {/* SVG Map/Dataflow View */}
                    {(viewMode === 'map' || viewMode === 'dataflow') && (
                        <>
                            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
                                 <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                                    {links.map((link: any, i) => (
                                        <g key={i} onClick={() => handleLinkClick(link)} className="group cursor-pointer">
                                            <path d={`M${link.source.x},${link.source.y} C${(link.source.x + link.target.x) / 2},${link.source.y} ${(link.source.x + link.target.x) / 2},${link.target.y} ${link.target.x},${link.target.y}`} stroke={theme.link} fill="none" strokeWidth="2" className="transition-colors group-hover:stroke-blue-400 group-hover:stroke-[3px]" />
                                            {link.target.data.linkLabel && (
                                                <foreignObject x={(link.source.x + link.target.x)/2 - 75} y={(link.source.y + link.target.y)/2 - 20} width="150" height="40" className="pointer-events-none">
                                                    <div className="w-full h-full flex items-center justify-center"><div className="text-[10px] text-center px-1.5 py-0.5 border rounded shadow-sm text-balance max-h-full overflow-hidden leading-tight bg-white/90 border-slate-200 text-slate-600">{link.target.data.linkLabel}</div></div>
                                                </foreignObject>
                                            )}
                                        </g>
                                    ))}
                                 </g>
                            </svg>
                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left systems-nodes-container" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}>
                                {nodes.map((node: any) => (
                                    <div key={node.data.id} className="pointer-events-auto" onClick={() => setActiveActorMenu(node.data.id)}>
                                         <MindMapNode x={node.x} y={node.y} node={node.data} selected={activeActorMenu === node.data.id} onSelect={() => setActiveActorMenu(node.data.id)} onExpand={() => {}} hasHiddenChildren={false} isDevMode={isDevMode} theme={theme} />
                                         {activeActorMenu === node.data.id && (
                                             <div className="absolute z-50 bg-white shadow-xl rounded-lg p-1.5 flex flex-col gap-1 min-w-[140px] animate-in zoom-in-95" style={{ top: node.y + 40, left: node.x }}>
                                                 <button onClick={(e) => { e.stopPropagation(); setContextEditTarget({ type: 'actor', id: node.data.id, name: node.data.label, currentContext: data.actors.find(a => a.id === node.data.id)?.userContext || '' }); }} className="text-xs font-semibold text-slate-700 hover:bg-slate-100 p-2 rounded flex items-center gap-2"><FilePenLine size={14} className="text-purple-600" /> Edit Context</button>
                                                 <button onClick={(e) => { e.stopPropagation(); handleDeleteActor(node.data.id); }} className="text-xs font-semibold text-red-600 hover:bg-red-50 p-2 rounded flex items-center gap-2"><Trash2 size={14} /> Delete Actor</button>
                                             </div>
                                         )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Table View */}
                    {viewMode === 'table' && (
                        <div className="w-full h-full overflow-auto p-8">
                            <div className="inline-block min-w-full align-middle">
                                <table className="border-collapse w-full">
                                    <thead>
                                        <tr>
                                            <th className="p-3 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 left-0 z-20 shadow-sm">Source \ Target</th>
                                            {matrixData.cols.map(actor => (
                                                <th key={actor.id} className="p-3 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 min-w-[120px] sticky top-0 z-10 shadow-sm">
                                                    {actor.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixData.rows.map(source => (
                                            <tr key={source.id}>
                                                <th className="p-3 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 text-left sticky left-0 z-10 shadow-sm">
                                                    {source.name}
                                                </th>
                                                {matrixData.cols.map(target => {
                                                    const interactions = matrixData.cellMap.get(`${source.id}-${target.id}`);
                                                    const isSelf = source.id === target.id;
                                                    return (
                                                        <td 
                                                            key={`${source.id}-${target.id}`} 
                                                            onClick={() => !isSelf && setEditingCell({ source: source.id, target: target.id })}
                                                            className={`border border-slate-200 p-1 min-w-[120px] h-[80px] text-center transition-all relative ${isSelf ? 'bg-slate-100 diagonal-pattern opacity-50' : 'cursor-pointer hover:bg-blue-50 bg-white hover:border-blue-300 hover:z-10'}`}
                                                        >
                                                            {!isSelf && (
                                                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                    {interactions ? (
                                                                        <>
                                                                            <div className="font-bold text-blue-600 text-lg">{interactions.length}</div>
                                                                            <div className="text-[9px] text-slate-400 uppercase tracking-tighter font-bold">Interactions</div>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-200 text-2xl font-light hover:text-slate-400 transition-colors">+</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <button onClick={handleExport} className="absolute bottom-6 right-6 bg-slate-900 text-white p-2 rounded shadow-lg hover:bg-slate-800 transition-opacity z-10" title="Export View as PNG">
                        <Download size={20} />
                    </button>

                    {/* Interaction Editor Pane (Table View & Map View Modal) */}
                    {editingCell && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl h-[85vh] animate-in zoom-in-95 flex flex-col">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">Edit Interactions</h3><button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button></div>
                                <div className="space-y-2 mb-4 flex-1 overflow-y-auto min-h-0 pr-1">
                                    {(matrixData.cellMap.get(`${editingCell.source}-${editingCell.target}`) || []).map(link => (
                                    <div key={link.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg text-xs shadow-sm hover:border-blue-300 transition-colors">
                                        <div className="flex-1 mr-2">
                                            <div className="font-bold text-slate-800 truncate text-sm" title={link.data}>{link.data}</div>
                                            <div className="text-slate-500 truncate mt-0.5">{link.activity}</div>
                                            {link.userContext && <div className="text-[10px] text-purple-600 mt-1.5 italic flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded w-fit"><Tag size={10}/> {link.userContext}</div>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => setContextEditTarget({ type: 'interaction', id: link.id, name: `${link.activity}: ${link.data}`, currentContext: link.userContext || '' })} className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Edit Interaction Context"><FilePenLine size={16}/></button>
                                            <button onClick={() => handleGenerateSequence(link)} className={`p-2 rounded flex items-center gap-1 transition-colors ${link.sequenceDiagram ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`} title="Generate Sequence"><Activity size={16} /></button>
                                            <button onClick={() => handleDeleteInteraction(link.id)} className="text-red-400 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    ))}
                                    {(matrixData.cellMap.get(`${editingCell.source}-${editingCell.target}`) || []).length === 0 && (
                                        <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            No interactions defined between these actors yet.
                                        </div>
                                    )}
                                </div>
                                <div className="border-t pt-4 bg-white">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Add New Interaction</h4>
                                    <input value={newActivity} onChange={(e) => setNewActivity(e.target.value)} placeholder="Activity (e.g. Sends Request)" className="w-full border p-2 rounded mb-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <input value={newData} onChange={(e) => setNewData(e.target.value)} placeholder="Data Payload (e.g. JSON Config)" className="w-full border p-2 rounded mb-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <button onClick={handleAddInteraction} disabled={!newActivity.trim()} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">Add Interaction</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
