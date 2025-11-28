
import React, { useState, useCallback, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { Brain, Sparkles, Loader2, Upload, Download, FileJson, AlertCircle, FileText, X, BookOpen, Code, RotateCcw, RotateCw, History, Terminal, Bug, Share2, Sliders, Clock, AlertTriangle, Palette, PenLine, Tag, Settings, FileBox, GraduationCap, Menu, Library, ArrowRight, ChevronDown, ChevronUp, ChevronRight, Target, TrendingUp, CheckCircle, ShieldCheck, Book, Info } from 'lucide-react';
import { generateMindMap, expandNode, getNodeDetails, generateProcessFlow, generateSystemsView, generateSeedText, constructDetailsPrompt, constructProcessPrompt, generateNodeSummary, generateThesisCandidates, suggestReferences, refineNodeDetails, refineProcessFlow, respondToChallenge, generateCritiques } from './services/geminiService';
import { generateHTMLReport, generateStructuredDocument } from './utils/reportGenerator';
import { MindMap } from './components/MindMap';
import { DetailsModal, ProcessModal, InfoModal, HistoryModal, LogModal, RenameModal, IdeaModal } from './components/Modals';
import { EditNodeModal } from './components/EditNodeModal';
import { ExpandModal } from './components/ExpandModal';
import { SystemsViewModal } from './components/SystemsViewModal';
import { GenerationModal } from './components/GenerationModal';
import { ResetNodeModal } from './components/ResetNodeModal';
import { QuotaModal } from './components/QuotaModal';
import { ThemeEditor } from './components/ThemeEditor';
import { ConceptCloud } from './components/ConceptCloud';
import { SettingsModal } from './components/SettingsModal';
import { PromptDebugModal } from './components/PromptDebugModal';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { CandidateProfileForm } from './components/CandidateProfileForm';
import { ReferenceModal } from './components/ReferenceModal';
import { ThesisContextModal } from './components/ThesisContextModal';
import { PromptLibraryModal } from './components/PromptLibraryModal'; // NEW IMPORT
import { MindMapData, LoadingState, ProcessStep, LogEntry, SystemsViewData, TuningOptions, AppTheme, AppSettings, ThesisCandidate, CandidateProfile, Reference, ChallengeEntry, ContentVersion } from './types';
import { USER_GUIDE, TECH_SPEC } from './constants/docs';
import { DEFAULT_THEME } from './constants/theme';
import { TUTORIAL_SESSION } from './constants/tutorialData';
import { logger } from './utils/logger';

// ... (Utility Functions: findNodeAndPath, calculateNodeNumber, downloadFile, autoLinkDecisions, checkDependencies - SAME AS BEFORE)
const findNodeAndPath = (root: MindMapData, targetId: string, currentPath: string[] = []): { node: MindMapData; path: string[]; parent: MindMapData | null } | null => {
  if (root.id === targetId) return { node: root, path: [...currentPath, root.label], parent: null };
  if (root.children) {
    for (const child of root.children) {
        if (child.id === targetId) return { node: child, path: [...currentPath, root.label, child.label], parent: root };
        const result = findNodeAndPath(child, targetId, [...currentPath, root.label]);
        if (result) return result;
    }
  }
  return null;
};

const calculateNodeNumber = (root: MindMapData, targetId: string, currentNumber: string = "1.0"): string | null => {
    if (root.id === targetId) return currentNumber;
    if (root.children) {
        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const childNumber = `${currentNumber === "1.0" ? "1" : currentNumber}.${i + 1}`;
            const result = calculateNodeNumber(child, targetId, childNumber);
            if (result) return result;
        }
    }
    return null;
};

const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const autoLinkDecisions = (steps: ProcessStep[]): ProcessStep[] => {
    return steps.map((step, index) => {
        if (step.type === 'decision' && step.branches && step.branches.length > 0) {
            const nextStep = steps[index + 1];
            if (nextStep) {
                const positiveKeywords = ['yes', 'success', 'pass', 'ok', 'true', 'confirmed', 'valid'];
                const hasLink = step.branches.some(b => !!b.targetStepId);
                
                if (!hasLink) {
                    const bestBranchIndex = step.branches.findIndex(b => positiveKeywords.some(k => b.label.toLowerCase().includes(k)));
                    const targetIndex = bestBranchIndex !== -1 ? bestBranchIndex : 0; 
                    const newBranches = [...step.branches];
                    newBranches[targetIndex] = { ...newBranches[targetIndex], targetStepId: nextStep.id };
                    return { ...step, branches: newBranches };
                }
            }
        }
        return step;
    });
};

const checkDependencies = (root: MindMapData, changedNodeId: string): MindMapData => {
    const traverse = (node: MindMapData): MindMapData => {
        const newNode = { ...node };
        if (newNode.watchedNodeIds?.includes(changedNodeId)) {
            newNode.isFlaggedForReview = true;
            const currentFlags = newNode.flaggedSourceIds || [];
            if (!currentFlags.includes(changedNodeId)) {
                newNode.flaggedSourceIds = [...currentFlags, changedNodeId];
            }
        }
        if (newNode.children) {
            newNode.children = newNode.children.map(traverse);
        }
        return newNode;
    };
    return traverse(root);
};

const SAMPLE_TEXT = `ADS-C (Automatic Dependent Surveillance – Contract) is a system that lets air traffic control (ATC) automatically receive position and flight-intent reports...`;

// History stack entry
interface HistoryEntry {
    data: MindMapData;
    description: string;
    timestamp: number;
}

const DOCTORAL_TUNING: TuningOptions = {
    readerRole: 'Academic Review Board',
    aiPersona: 'Disciplined Research Assistant',
    detailLevel: 'Doctoral Thesis'
};

const DEFAULT_SETTINGS: AppSettings = {
    reviewPrompts: false,
    autoSave: false
};

const App: React.FC = () => {
  // --- State Management ---
  const [textInput, setTextInput] = useState('');
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [originalText, setOriginalText] = useState('');
  
  // Thesis Exploration State
  const [creationPhase, setCreationPhase] = useState<'input' | 'selection' | 'generating'>('input');
  const [thesisCandidates, setThesisCandidates] = useState<ThesisCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ThesisCandidate | null>(null); // STORE SELECTION
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  
  // Candidate Profile State
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>({
      degreeLevel: 'PhD',
      fieldOfStudy: '',
      keySkills: '',
      careerGoals: '',
      generalInfo: ''
  });

  // Reference System State
  const [references, setReferences] = useState<Reference[]>([]);
  const [showReferenceModal, setShowReferenceModal] = useState<{ node: MindMapData | null }>({ node: null });
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  const [tuning] = useState<TuningOptions>(DOCTORAL_TUNING);
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sessionName, setSessionName] = useState('Untitled Thesis');

  // Sidebar Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTutorialMode, setIsTutorialMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  // History & Persistence
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Developer Mode
  const [isDevMode, setIsDevMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Systems View State
  const [systemsViewData, setSystemsViewData] = useState<SystemsViewData | null>(null);
  const [systemsViewLocked, setSystemsViewLocked] = useState(true);
  const [showSystemsView, setShowSystemsView] = useState(false);
  
  // Concept Cloud State
  const [showConceptCloud, setShowConceptCloud] = useState(false);
  const [conceptFilter, setConceptFilter] = useState<string | null>(null);

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [maxTime, setMaxTime] = useState<number>(0);

  // --- Modals Management ---
  const [detailsContent, setDetailsContent] = useState<{ id: string, title: string; content: string, isLocked: boolean } | null>(null);
  const [processContent, setProcessContent] = useState<{ id: string, title: string; steps: ProcessStep[], isLocked: boolean, startEditing?: boolean } | null>(null);
  const [editNodeData, setEditNodeData] = useState<{ node: MindMapData, number: string } | null>(null);
  const [expandNodeData, setExpandNodeData] = useState<MindMapData | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<'userGuide' | 'techSpec' | 'history' | 'logs' | 'prompts' | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [generationModal, setGenerationModal] = useState<{ node: MindMapData, type: 'details' | 'process' } | null>(null);
  const [resetNodeData, setResetNodeData] = useState<MindMapData | null>(null);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [showThesisContextModal, setShowThesisContextModal] = useState(false); // NEW MODAL
  
  const [documentEditorData, setDocumentEditorData] = useState<{ node: MindMapData, number: string } | null>(null);
  
  const [promptDebug, setPromptDebug] = useState<{ active: boolean; type: string; userPrompt: string; onConfirm: (finalPrompt: string) => void; } | null>(null);

  // ... (useEffect for Logger and Timer same as before) ...
  useEffect(() => { const unsubscribe = logger.subscribe((entry) => { setLogs(prev => [...prev, entry]); }); return unsubscribe; }, []);
  useEffect(() => { if (loading === 'idle') { setTimeLeft(null); return; } const duration = 15; setMaxTime(duration); setTimeLeft(duration); const timer = setInterval(() => { setTimeLeft((prev) => { if (prev === null || prev <= 0) return 0; return prev - 1; }); }, 1000); return () => clearInterval(timer); }, [loading]);

  // ... (History functions same as before) ...
  const commitToHistory = useCallback((newData: MindMapData, description: string) => { setMindMap(newData); setUnsavedChanges(true); setHistory(prev => { const currentHistory = prev.slice(0, historyIndex + 1); const newHistory = [...currentHistory, { data: newData, description, timestamp: Date.now() }]; if (newHistory.length > 10) newHistory.shift(); return newHistory; }); logger.info("Committed State to History", { description }); }, [historyIndex]);
  useEffect(() => { setHistoryIndex(history.length - 1); }, [history]);
  const restoreFromHistory = (index: number) => { if (index >= 0 && index < history.length) { setMindMap(history[index].data); setHistoryIndex(index); setActiveInfoModal(null); logger.info("Restored State from History", { index }); } };

  // ... (processAIReferences, updateNodeInTree, handleSearchReveal - same logic)
  const processAIReferences = (nodes: any[]): { cleanedNodes: MindMapData[], newRefs: Reference[] } => {
      const extractedRefs: Reference[] = [];
      const traverse = (node: any): MindMapData => {
          const newNode: MindMapData = { ...node };
          if (node.references && Array.isArray(node.references)) {
              const nodeRefIds: string[] = [];
              node.references.forEach((refData: any) => {
                  const existing = [...references, ...extractedRefs].find(r => r.citation === refData.citation);
                  if (existing) { nodeRefIds.push(existing.id); } else {
                      const newId = crypto.randomUUID();
                      const newRef: Reference = { id: newId, citation: refData.citation, description: refData.description, url: refData.url, source: 'ai' };
                      extractedRefs.push(newRef);
                      nodeRefIds.push(newId);
                  }
              });
              newNode.referenceIds = nodeRefIds;
              delete (newNode as any).references;
          }
          if (newNode.children) { newNode.children = newNode.children.map(traverse); }
          return newNode;
      };
      const cleaned = nodes.map(traverse);
      return { cleanedNodes: cleaned, newRefs: extractedRefs };
  };

  // Helper: Ingest references from structured AI responses (Details, Summary)
  const ingestReferences = (newRefs: Reference[], targetNodeId: string) => {
      if (!newRefs || newRefs.length === 0) return;
      
      const toAdd: Reference[] = [];
      const idsToAttach: string[] = [];

      newRefs.forEach(ref => {
          // Check for existing reference by citation to avoid dupes
          const existing = [...references, ...toAdd].find(r => r.citation === ref.citation);
          if (existing) {
              idsToAttach.push(existing.id);
          } else {
              toAdd.push(ref);
              idsToAttach.push(ref.id);
          }
      });

      if (toAdd.length > 0) {
          setReferences(prev => [...prev, ...toAdd]);
      }

      if (idsToAttach.length > 0) {
          updateNodeInTree(targetNodeId, n => {
              const currentIds = n.referenceIds || [];
              const merged = [...new Set([...currentIds, ...idsToAttach])];
              return { ...n, referenceIds: merged };
          }, "Auto-attached references", false, false); // No history commit here to avoid spamming stack, handled by parent action
      }
  };

  const updateNodeInTree = (nodeId: string, updateFn: (node: MindMapData) => MindMapData, actionDescription: string = "Update node", shouldAutoSave: boolean = false, triggerDependencyCheck: boolean = false) => { 
      if (!mindMap) return; 
      let clone = JSON.parse(JSON.stringify(mindMap)); 
      const target = findNodeAndPath(clone, nodeId); 
      if (target) { 
          Object.assign(target.node, updateFn(target.node)); 
          if (triggerDependencyCheck) { clone = checkDependencies(clone, nodeId); } 
          if (isReferenceModalOpen && showReferenceModal.node && showReferenceModal.node.id === nodeId) { setShowReferenceModal({ node: target.node }); }
          commitToHistory(clone, actionDescription); 
      } 
  };

  const handleSearchReveal = useCallback((idsToExpand: string[]) => { setMindMap(prev => { if (!prev) return null; const clone = JSON.parse(JSON.stringify(prev)); let changed = false; idsToExpand.forEach(id => { const target = findNodeAndPath(clone, id); if (target && target.node._collapsed) { target.node._collapsed = false; changed = true; } }); if (!changed) return prev; return clone; }); }, []);

  // --- THESIS WORKFLOW (UPDATED) ---
  const handleBrainstorm = async () => {
      if (!textInput.trim()) return;
      setLoading('brainstorming');
      try {
          const candidates = await generateThesisCandidates(textInput, tuning, candidateProfile);
          setThesisCandidates(candidates);
          setCreationPhase('selection');
      } catch (e: any) {
          if(e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true);
          else alert(e.message);
      } finally {
          setLoading('idle');
      }
  };

  const handleSelectCandidate = async (candidate: ThesisCandidate) => {
      setLoading('generating-map');
      setSelectedCandidate(candidate);
      setOriginalText(`Topic: ${textInput}\nThesis Statement: ${candidate.thesisStatement}\nProposed Methodology: ${candidate.methodologyHint}`);
      const safeTitle = candidate.title || "Untitled Thesis";
      setSessionName(safeTitle.substring(0, 50));
      setSystemsViewData(null);
      setSystemsViewLocked(true);
      setReferences([]);
      try {
        const fullContext = `Thesis Title: ${safeTitle}\nHypothesis/Statement: ${candidate.thesisStatement}\nMethodology Hint: ${candidate.methodologyHint}\nOriginal Topic: ${textInput}`;
        const rawData = await generateMindMap(fullContext, tuning, candidateProfile);
        const { cleanedNodes, newRefs } = processAIReferences([rawData]);
        setReferences(newRefs);
        setMindMap(cleanedNodes[0]);
        setHistory([{ data: cleanedNodes[0], description: "Initial Thesis Generation", timestamp: Date.now() }]);
        setHistoryIndex(0);
        setUnsavedChanges(true);
        setLoading('idle');
        setCreationPhase('input'); 
      } catch (e: any) {
        if(e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true);
        else alert(e.message);
      }
  };

  // ... (Other handlers: handleSystemsView, handleImportSession, saveSessionFile, etc. - same logic)
  const handleSystemsView = async () => { if (systemsViewData && systemsViewLocked) { setShowSystemsView(true); return; } setLoading('generating-systems'); try { const data = await generateSystemsView(originalText, tuning); setSystemsViewData(data); setSystemsViewLocked(true); setShowSystemsView(true); setLoading('idle'); } catch (e: any) { if(e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true); else alert(e.message); } };
  const handleImportSession = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { const text = await file.text(); const json = JSON.parse(text); if (json.mindMap) { const importedMap = json.mindMap; const collapseRecursive = (node: MindMapData) => { if (node.children) { node.children.forEach(collapseRecursive); } node._collapsed = true; }; collapseRecursive(importedMap); importedMap._collapsed = false; setMindMap(importedMap); setOriginalText(json.originalText || ''); setTextInput(json.originalText || ''); if (json.theme) setTheme(json.theme); if (json.settings) setSettings(json.settings); if (json.sessionName) setSessionName(json.sessionName); if (json.references) setReferences(json.references); if (json.selectedCandidate) setSelectedCandidate(json.selectedCandidate); setHistory([{ data: importedMap, description: "Imported Session", timestamp: Date.now() }]); setUnsavedChanges(false); if (json.systemsView) { setSystemsViewData(json.systemsView); setSystemsViewLocked(true); } logger.success("Session Imported", { nodes: 1 }); } else { alert("Invalid session file."); } } catch (err: any) { alert(`Failed to load session: ${err.message}`); } finally { if (sessionInputRef.current) sessionInputRef.current.value = ''; } };
  const saveSessionFile = (data: MindMapData) => { const sessionData = { timestamp: new Date().toISOString(), sessionName, originalText, mindMap: data, systemsView: systemsViewData, references, selectedCandidate, tuning, theme, settings }; const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" }); downloadFile(blob, `${sessionName.replace(/[^a-z0-9]/gi, '-')}.json`); setUnsavedChanges(false); };
  const handleExportSession = () => { if (mindMap) saveSessionFile(mindMap); };
  const handleExportDocument = () => { if (!mindMap) return; const html = generateStructuredDocument(mindMap); const blob = new Blob([html], { type: "text/html;charset=utf-8" }); downloadFile(blob, `${sessionName.replace(/[^a-z0-9]/gi, '-')}-Document.html`); };
  const handleGenerateSeedText = async (idea: string) => { setLoading('brainstorming'); try { const text = await generateSeedText(idea, tuning); setTextInput(text); } catch (e: any) { alert(e.message); } finally { setLoading('idle'); } };
  const handleStartTutorial = () => { setMindMap(TUTORIAL_SESSION.mindMap); setSessionName(TUTORIAL_SESSION.sessionName); setOriginalText(TUTORIAL_SESSION.originalText); setTheme(TUTORIAL_SESSION.theme); setSettings(TUTORIAL_SESSION.settings); setSystemsViewData(TUTORIAL_SESSION.systemsView); setReferences([]); setHistory([{ data: TUTORIAL_SESSION.mindMap, description: "Tutorial Start", timestamp: Date.now() }]); setHistoryIndex(0); setIsTutorialMode(true); };
  const handleLoadTestProfile = () => { setTextInput("Societal Impacts of Autonomous Systems in Public Infrastructure"); setCandidateProfile({ degreeLevel: 'PhD', fieldOfStudy: 'Aviation, safety, sociology, computer science, policy', keySkills: '25 years aviation expert, safety and policy specialist, Msc by research, MSc project management, BBus Aviation management, BSc software development', careerGoals: 'Policy role', generalInfo: 'Interdisciplinary research combining technical aviation safety with sociological impact analysis.' }); setShowProfileForm(true); };
  const handleAddToMindMap = (parentId: string, newNodes: MindMapData[]) => { updateNodeInTree(parentId, (node) => ({ ...node, children: [...(node.children || []), ...newNodes], _collapsed: false }), "Added actors from Systems View"); };
  const handleReferenceAction = (node: MindMapData | null) => { setShowReferenceModal({ node }); setIsReferenceModalOpen(true); };
  
  // ... (Node Action Handlers - same logic)
  const handleNodeAction = useCallback(async (action: 'expand' | 'details' | 'process' | 'edit' | 'delete' | 'report' | 'reset' | 'document' | 'references', node: MindMapData) => { if (!mindMap) return; if (action === 'delete') { if (mindMap.id === node.id) { setMindMap(null); setHistory([]); return; } let clone = JSON.parse(JSON.stringify(mindMap)); const target = findNodeAndPath(clone, node.id); if (target && target.parent) { target.parent.children = target.parent.children?.filter(c => c.id !== node.id); clone = checkDependencies(clone, node.id); commitToHistory(clone, `Deleted node: ${node.label}`); } return; } if (action === 'edit') { const number = calculateNodeNumber(mindMap, node.id) || "1.0"; setEditNodeData({ node, number }); return; } if (action === 'reset') { setResetNodeData(node); return; } if (action === 'report') { const html = generateHTMLReport(node); const blob = new Blob([html], { type: "text/html;charset=utf-8" }); downloadFile(blob, `Report.html`); return; } if (action === 'document') { const number = calculateNodeNumber(mindMap, node.id) || "1.0"; setDocumentEditorData({ node, number }); return; } if (action === 'references') { handleReferenceAction(node); return; } if (action === 'expand') { if (node.children && node.children.length > 0) { updateNodeInTree(node.id, (n) => ({ ...n, _collapsed: !n._collapsed }), `Toggled visibility`); return; } setExpandNodeData(node); return; } if (action === 'details') { if (node.cachedDetails) { setDetailsContent({ id: node.id, title: node.label, content: node.cachedDetails, isLocked: node.detailsLocked ?? true }); return; } setGenerationModal({ node, type: 'details' }); } else if (action === 'process') { if (node.cachedProcess && node.cachedProcess.length > 0) { setProcessContent({ id: node.id, title: node.label, steps: node.cachedProcess, isLocked: node.processLocked ?? true }); return; } setGenerationModal({ node, type: 'process' }); } }, [mindMap, originalText, historyIndex, tuning]); 

  // ... (Generation handlers - updated to handle ref extraction)
  const handleGenerationSelect = async (mode: 'auto' | 'guided' | 'manual', guidance?: string) => { const { node, type } = generationModal || {}; setGenerationModal(null); if (!node || !type || !mindMap) return; const found = findNodeAndPath(mindMap, node.id); const contextPath = found ? found.path : [node.label]; if (mode === 'manual') { if (type === 'process') { const initialSteps: ProcessStep[] = [{ id: crypto.randomUUID(), stepNumber: 1, type: 'action', action: 'Start', description: '', role: 'User' }]; updateNodeInTree(node.id, (n) => ({ ...n, cachedProcess: initialSteps, processLocked: false }), `Manual process`, false, true); setProcessContent({ id: node.id, title: node.label, steps: initialSteps, isLocked: false, startEditing: true }); } else { updateNodeInTree(node.id, (n) => ({ ...n, cachedDetails: "Start typing...", detailsLocked: false }), `Manual details`, false, true); setDetailsContent({ id: node.id, title: node.label, content: "Start typing...", isLocked: false }); } return; } const userGuidance = (mode === 'guided' || mode === 'auto') ? guidance : undefined; const nodeReferences = references.filter(r => node.referenceIds?.includes(r.id)); if (type === 'details') { setLoading('detailing'); try { 
      // Updated to handle structured response
      const { content: text, newReferences } = await getNodeDetails(node.label, contextPath, originalText, tuning, userGuidance, nodeReferences, node.cachedProcess); 
      
      // Auto-ingest new references found by AI
      ingestReferences(newReferences, node.id);

      updateNodeInTree(node.id, (n) => ({ ...n, cachedDetails: text, detailsLocked: true }), `Generated details`, true, true); 
      setDetailsContent({ id: node.id, title: node.label, content: text, isLocked: true }); 
  } catch (e: any) { alert(e.message); } finally { setLoading('idle'); } } else if (type === 'process') { setLoading('mapping-process'); try { let steps = await generateProcessFlow(node.label, contextPath, originalText, tuning, node.cachedDetails, userGuidance, nodeReferences); steps = autoLinkDecisions(steps); updateNodeInTree(node.id, (n) => ({ ...n, cachedProcess: steps, processLocked: true }), `Mapped process`, true, true); setProcessContent({ id: node.id, title: node.label, steps, isLocked: true }); } catch (e: any) { alert(e.message); } finally { setLoading('idle'); } } };
  
  const handleRefineDetails = async (guidance: string) => { if (!detailsContent || !mindMap) return; const { id, title, content } = detailsContent; const found = findNodeAndPath(mindMap, id); const contextPath = found ? found.path : [title]; setLoading('detailing'); try { const node = found?.node; const nodeReferences = node ? references.filter(r => node.referenceIds?.includes(r.id)) : []; 
      const { content: newText, newReferences } = await refineNodeDetails(title, content, contextPath, originalText, tuning, guidance, nodeReferences, node?.cachedProcess); 
      
      ingestReferences(newReferences, id);

      updateNodeInTree(id, (n) => { const history = n.cachedDetails ? [...(n.detailsHistory || []), { id: crypto.randomUUID(), timestamp: Date.now(), content: n.cachedDetails, reason: "Refinement" }] : n.detailsHistory; return { ...n, cachedDetails: newText, detailsHistory: history }; }, "Refined details", true, true); setDetailsContent({ ...detailsContent, content: newText }); } catch (e: any) { if (e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true); else alert(e.message); } finally { setLoading('idle'); } };
  
  const handleRefineProcess = async (guidance: string) => { if (!processContent || !mindMap) return; const { id, title, steps } = processContent; const found = findNodeAndPath(mindMap, id); const contextPath = found ? found.path : [title]; setLoading('mapping-process'); try { const node = found?.node; const nodeReferences = node ? references.filter(r => node.referenceIds?.includes(r.id)) : []; const newSteps = await refineProcessFlow(title, steps, contextPath, originalText, tuning, guidance, nodeReferences); updateNodeInTree(id, (n) => { const history = n.cachedProcess ? [...(n.processHistory || []), { id: crypto.randomUUID(), timestamp: Date.now(), content: n.cachedProcess, reason: "Refinement" }] : n.processHistory; return { ...n, cachedProcess: newSteps, processHistory: history }; }, "Refined process", true, true); setProcessContent({ ...processContent, steps: newSteps }); } catch (e: any) { if (e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true); else alert(e.message); } finally { setLoading('idle'); } };
  const handleChallenge = async (nodeId: string, challenge: string, type: 'details' | 'process') => { if (!mindMap) return; const found = findNodeAndPath(mindMap, nodeId); if (!found) return; const { node, path } = found; const content = type === 'details' ? (node.cachedDetails || '') : JSON.stringify(node.cachedProcess || []); setLoading('challenging'); try { const nodeReferences = references.filter(r => node.referenceIds?.includes(r.id)); const response = await respondToChallenge(node.label, path, content, challenge, tuning, nodeReferences); const entry: ChallengeEntry = { id: crypto.randomUUID(), timestamp: Date.now(), userQuery: challenge, aiResponse: response }; updateNodeInTree(nodeId, (n) => ({ ...n, challenges: [...(n.challenges || []), entry] }), "Added challenge"); } catch (e: any) { if (e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true); else alert(e.message); } finally { setLoading('idle'); } };
  const handleGenerateCritiques = async (nodeId: string, type: 'details' | 'process', count: number): Promise<string[]> => { if (!mindMap) return []; const found = findNodeAndPath(mindMap, nodeId); if (!found) return []; const { node, path } = found; const content = type === 'details' ? (node.cachedDetails || '') : JSON.stringify(node.cachedProcess || []); if (!content || content.length < 10) return ["Not enough content to critique."]; try { return await generateCritiques(node.label, path, content, count, tuning); } catch (e: any) { if (e.message === 'QUOTA_EXCEEDED') setShowQuotaModal(true); else alert(e.message); return []; } };
  const handleConfirmExpand = async (guidance: string) => { if (!expandNodeData || !mindMap) return; const node = expandNodeData; setExpandNodeData(null); const found = findNodeAndPath(mindMap, node.id); const contextPath = found ? found.path : [node.label]; setLoading('expanding'); const nodeReferences = references.filter(r => node.referenceIds?.includes(r.id)); try { const rawChildren = await expandNode(node.label, contextPath, originalText, tuning, guidance, nodeReferences); const { cleanedNodes, newRefs } = processAIReferences(rawChildren); setReferences(prev => [...prev, ...newRefs]); updateNodeInTree(node.id, (n) => ({ ...n, children: cleanedNodes, _collapsed: false }), `Expanded node`, true); } catch (e: any) { alert(e.message); } finally { setLoading('idle'); } };
  const handleConceptHover = useCallback((concept: string | null) => { setConceptFilter(concept); if (concept) handleSearchReveal([]); }, [handleSearchReveal]);
  const handleSelectNodeFromCloud = (nodeId: string) => { handleSearchReveal([nodeId]); };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans relative" style={{ backgroundColor: theme.canvasBg }}>
      {/* ... (Tutorial, Timer Same) ... */}
      {isTutorialMode && <TutorialOverlay onComplete={() => { setIsTutorialMode(false); setMindMap(null); setHistory([]); setSessionName('Untitled Session'); setOriginalText(''); setTextInput(''); setCreationPhase('input'); }} />}
      {loading !== 'idle' && timeLeft !== null && (<div className="fixed top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-blue-200 shadow-xl rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-300 min-w-[280px]"><Loader2 className="animate-spin text-blue-600" /><div><h4 className="font-bold text-slate-800 text-sm">AI Working...</h4><p className="text-xs text-slate-500">Estimated time remaining: {timeLeft}s</p></div></div>)}

      {/* Sidebar Area */}
      <div className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20 shadow-xl ${mindMap ? 'w-16 items-center py-4' : 'w-full max-w-4xl mx-auto border-r-0 h-screen justify-center'}`}>
        
        {mindMap ? (
            // ... (Menu Implementation Updated) ...
            <div className="flex flex-col h-full w-full items-center relative pt-4">
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-3 rounded-xl transition-all duration-200 id="sidebar-menu-btn" ${isMenuOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm border border-slate-100'}`} data-tutorial-id="sidebar-menu-btn">{isMenuOpen ? <X size={24} /> : <Library size={24} />}</button>
                 {isMenuOpen && (<div className="absolute top-0 left-full ml-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl p-2 min-w-[260px] flex flex-col gap-1 max-h-[90vh] overflow-y-auto z-[100]">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">File</div>
                    <button onClick={() => { setShowRenameModal(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><PenLine size={18} className="text-slate-400" /> Rename Session</button>
                    <button onClick={() => { handleExportSession(); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><Download size={18} className="text-slate-400" /> Save JSON</button>
                    <button onClick={() => { handleExportDocument(); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><FileBox size={18} className="text-slate-400" /> Export HTML Doc</button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Research</div>
                    {selectedCandidate && (
                        <button onClick={() => { setShowThesisContextModal(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left">
                            <Info size={18} className="text-blue-500" /> Thesis Charter
                        </button>
                    )}
                    <button onClick={() => { handleSystemsView(); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><Share2 size={18} className="text-purple-500" /> Systems View</button>
                    <button onClick={() => { setShowConceptCloud(!showConceptCloud); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><Tag size={18} className="text-emerald-500" /> Concept Cloud</button>
                    <button onClick={() => { handleReferenceAction(null); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><Book size={18} className="text-pink-500" /> References</button>
                    <button onClick={() => { setShowThemeEditor(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium w-full text-left"><Palette size={18} className="text-indigo-500" /> Theme</button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">History</div>
                    <div className="flex gap-1 px-2">
                        <button onClick={() => restoreFromHistory(historyIndex - 1)} disabled={historyIndex <= 0} className="flex-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex justify-center bg-slate-50 border border-slate-100"><RotateCcw size={16} /></button>
                        <button onClick={() => restoreFromHistory(historyIndex + 1)} disabled={historyIndex >= history.length - 1} className="flex-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex justify-center bg-slate-50 border border-slate-100"><RotateCw size={16} /></button>
                    </div>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={() => { setShowCloseConfirmation(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium mt-1 w-full text-left"><X size={18} /> Close Map</button>
                 </div>)}
            </div>
        ) : (
            // Full Landing Mode
            <div className="p-8 w-full relative">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                     <button onClick={() => setActiveInfoModal('prompts')} className="p-2 text-slate-400 hover:text-purple-600 rounded-lg" title="Prompt Blueprints"><Terminal size={20} /></button>
                     <button onClick={() => setActiveInfoModal('userGuide')} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><BookOpen size={20} /></button>
                     <button onClick={() => setActiveInfoModal('techSpec')} className="p-2 text-slate-400 hover:text-slate-800 rounded-lg"><Code size={20} /></button>
                </div>

                <div className="flex items-center gap-4 mb-8 justify-center">
                    <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl"><Library size={32} /></div>
                    <div><h1 className="font-bold text-3xl text-slate-800 tracking-tight">ThesisForge</h1><p className="text-sm text-slate-500 font-medium">Your Disciplined AI Research Assistant</p></div>
                </div>

                {creationPhase === 'input' && (
                    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-slate-800">Step 1: Research Concept</h3>
                                <button 
                                    onClick={handleLoadTestProfile} 
                                    className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                    title="Load Example Data"
                                >
                                    <Sparkles size={12} /> Load Test Case
                                </button>
                            </div>
                            <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4" placeholder="e.g., The impact of AI on rural telemedicine..." value={textInput} onChange={(e) => setTextInput(e.target.value)} disabled={loading !== 'idle'} />
                            
                            <div className="mb-4">
                                <button onClick={() => setShowProfileForm(!showProfileForm)} className="text-sm font-bold text-blue-600 flex items-center gap-2 hover:underline mb-2">
                                    {showProfileForm ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} 
                                    {showProfileForm ? 'Hide Candidate Profile' : 'Add Candidate Profile (Optional)'}
                                </button>
                                {showProfileForm && <CandidateProfileForm profile={candidateProfile} onChange={setCandidateProfile} />}
                            </div>

                            <button onClick={handleBrainstorm} disabled={loading !== 'idle' || !textInput.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                                {loading === 'brainstorming' ? <><Loader2 className="animate-spin" size={18} /><span>Analyzing...</span></> : <><Sparkles size={18} /><span>Explore Thesis Options</span></>}
                            </button>
                        </div>
                        {/* Footer Options */}
                        <div className="border-t border-slate-200 pt-6">
                            <div className="flex gap-3 justify-center">
                                <input type="file" ref={sessionInputRef} className="hidden" accept=".json" onChange={handleImportSession} />
                                <button onClick={() => sessionInputRef.current?.click()} className="text-slate-500 hover:text-slate-800 text-xs font-bold py-2 px-4 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-2"><Upload size={14} /> Load Session</button>
                                <button onClick={handleStartTutorial} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold py-2 px-4 rounded border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-2"><GraduationCap size={14} /> Tutorial</button>
                            </div>
                        </div>
                    </div>
                )}

                {creationPhase === 'selection' && (
                    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 h-full flex flex-col">
                        <div className="flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-xl text-slate-800">Step 2: Select Thesis Candidate</h3>
                            <button onClick={() => setCreationPhase('input')} className="text-slate-500 hover:text-slate-800 text-sm font-medium">Back to Topic</button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 max-h-[70vh] pb-2 custom-scrollbar">
                            {thesisCandidates.map((candidate) => {
                                const isExpanded = expandedCandidateId === candidate.id;
                                const score = candidate.scoring?.overallScore || 0;
                                let scoreColor = score >= 80 ? 'text-emerald-700 bg-emerald-100' : score >= 60 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';
                                return (
                                    <div key={candidate.id} className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}>
                                        <div onClick={() => setExpandedCandidateId(isExpanded ? null : candidate.id)} className="p-4 cursor-pointer flex justify-between items-center bg-slate-50/50 hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-3 flex-1 pr-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${scoreColor}`}>{score}</div>
                                                <div><h4 className={`font-bold text-base ${isExpanded ? 'text-blue-700' : 'text-slate-700'}`}>{candidate.title}</h4><p className="text-xs text-slate-500 font-medium">Methodology: {candidate.methodologyHint}</p></div>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} className="text-blue-500 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
                                        </div>
                                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-5 pt-0 border-t border-slate-100">
                                                <div className="mt-4 space-y-4">
                                                    <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thesis Statement</span><p className="text-slate-700 text-sm italic border-l-4 border-blue-200 pl-3 mt-1 leading-relaxed bg-blue-50/50 p-2 rounded-r-lg">"{candidate.thesisStatement}"</p></div>
                                                    {candidate.scoring && (
                                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                            <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2"><Target size={14} className="text-blue-600" /><h5 className="text-xs font-bold text-slate-700 uppercase">Analysis Metrics</h5></div>
                                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                                                                {[{ label: "Career Align.", val: candidate.scoring.careerAlignment }, { label: "Feasibility", val: candidate.scoring.feasibility }, { label: "Method Fit", val: candidate.scoring.methodFit }, { label: "Novelty", val: candidate.scoring.novelty }, { label: "Ethical Ease", val: candidate.scoring.ethicalComplexity }, { label: "Clarity", val: candidate.scoring.clarity }].map((m) => (<div key={m.label} className="flex items-center justify-between"><span className="text-slate-500">{m.label}</span><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.val >= 8 ? 'bg-emerald-500' : m.val >= 5 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${m.val * 10}%` }} /></div><span className="font-mono font-bold w-4 text-right">{m.val}</span></div></div>))}
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                                                                <div><span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase mb-1"><CheckCircle size={10} /> Strengths</span><p className="text-xs text-slate-600 leading-snug">{candidate.scoring.strengths}</p></div>
                                                                <div><span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase mb-1"><ShieldCheck size={10} /> Concerns</span><p className="text-xs text-slate-600 leading-snug">{candidate.scoring.concerns}</p></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); handleSelectCandidate(candidate); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all mt-2"><Sparkles size={16} /> Generate Thesis Roadmap</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Main Map Content Area */}
      {mindMap && (<div className="flex-1 relative h-full overflow-hidden" style={{ backgroundColor: theme.canvasBg }}><MindMap data={mindMap} onNodeAction={handleNodeAction} onSearchReveal={handleSearchReveal} loading={loading} isDevMode={isDevMode} theme={theme} sessionName={sessionName} /></div>)}
      {showConceptCloud && mindMap && (<ConceptCloud data={mindMap} onSelectNode={handleSelectNodeFromCloud} onClose={() => setShowConceptCloud(false)} onHoverConcept={handleConceptHover} />)}
      
      {/* Reference Modal */}
      {isReferenceModalOpen && (
          <ReferenceModal 
              node={showReferenceModal.node}
              references={references}
              onAdd={(ref) => setReferences(prev => [...prev, ref])}
              onDelete={(id) => {
                  setReferences(prev => prev.filter(r => r.id !== id));
                  // Also detach from all nodes implicitly via updateNodeInTree but traversing whole tree is heavy.
                  // For now, we assume broken links are acceptable or cleaned on load.
              }}
              onAttach={(nodeId, refId) => updateNodeInTree(nodeId, n => ({ ...n, referenceIds: [...(n.referenceIds || []), refId] }), "Attached Reference")}
              onDetach={(nodeId, refId) => updateNodeInTree(nodeId, n => ({ ...n, referenceIds: n.referenceIds?.filter(id => id !== refId) }), "Detached Reference")}
              onGenerate={async (query) => {
                  if (showReferenceModal.node && mindMap) {
                      const found = findNodeAndPath(mindMap, showReferenceModal.node.id);
                      const path = found ? found.path : [showReferenceModal.node.label];
                      return await suggestReferences(showReferenceModal.node.label, path, showReferenceModal.node.description || '', query);
                  } else if (mindMap) {
                      // Fallback for global context generation
                      return await suggestReferences(mindMap.label, ["Thesis Root"], mindMap.description || 'General Research', query);
                  }
                  return [];
              }}
              onClose={() => setIsReferenceModalOpen(false)}
          />
      )}
      
      {/* Thesis Context Snapshot Modal */}
      {showThesisContextModal && selectedCandidate && (
          <ThesisContextModal candidate={selectedCandidate} onClose={() => setShowThesisContextModal(false)} />
      )}

      {/* ... (Other Modals) ... */}
      {showThemeEditor && <ThemeEditor theme={theme} onUpdate={setTheme} onClose={() => setShowThemeEditor(false)} />}
      {showSettingsModal && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setShowSettingsModal(false)} />}
      {promptDebug && promptDebug.active && <PromptDebugModal promptType={promptDebug.type} userPrompt={promptDebug.userPrompt} onConfirm={promptDebug.onConfirm} onCancel={() => setPromptDebug(null)} />}
      {showQuotaModal && <QuotaModal onClose={() => setShowQuotaModal(false)} />}
      {showRenameModal && <RenameModal currentName={sessionName} onRename={setSessionName} onClose={() => setShowRenameModal(false)} />}
      {showIdeaModal && <IdeaModal onConfirm={handleGenerateSeedText} onClose={() => setShowIdeaModal(false)} />}
      {showCloseConfirmation && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95"><h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500" /> Close Map?</h3><p className="text-sm text-slate-600 mb-4">Unsaved progress will be lost.</p><div className="flex flex-col gap-2"><button onClick={() => { if (mindMap) saveSessionFile(mindMap); setMindMap(null); setHistory([]); setOriginalText(''); setTextInput(''); setSystemsViewData(null); setSessionName('Untitled Session'); setCreationPhase('input'); setShowCloseConfirmation(false); }} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2"><Download size={16} /> Save & Start New</button><button onClick={() => { setMindMap(null); setHistory([]); setOriginalText(''); setTextInput(''); setSystemsViewData(null); setSessionName('Untitled Session'); setCreationPhase('input'); setShowCloseConfirmation(false); }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">Discard & Start New</button><button onClick={() => setShowCloseConfirmation(false)} className="w-full py-2 text-slate-500 hover:text-slate-800 text-sm font-medium">Cancel</button></div></div></div>}
      {resetNodeData && <ResetNodeModal node={resetNodeData} onConfirm={(d, p) => { updateNodeInTree(resetNodeData.id, (n) => ({ ...n, cachedDetails: d ? undefined : n.cachedDetails, cachedProcess: p ? undefined : n.cachedProcess, detailsLocked: d ? false : n.detailsLocked, processLocked: p ? false : n.processLocked }), `Cleared content`, false, true); setResetNodeData(null); }} onClose={() => setResetNodeData(null)} />}
      {generationModal && <GenerationModal node={generationModal.node} type={generationModal.type} onSelect={handleGenerationSelect} onClose={() => setGenerationModal(null)} />}
      {documentEditorData && mindMap && <DocumentEditorModal node={findNodeAndPath(mindMap, documentEditorData.node.id)?.node || documentEditorData.node} root={mindMap} nodeNumber={documentEditorData.number} onSave={(s) => { updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, userSummary: s }), `Updated summary`, true, true); }} onUpdateDependencies={(w) => updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, watchedNodeIds: w }), `Updated dependencies`)} onClearFlag={() => updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, isFlaggedForReview: false, flaggedSourceIds: [] }), `Cleared flag`)} onGenerate={async (l, d, p, g) => {
          const nodeRefs = references.filter(r => documentEditorData.node.referenceIds?.includes(r.id));
          // Wrap structured generator to return just text for the modal, but side-effect refs
          const { content, newReferences } = await generateNodeSummary(l, d, p, tuning, nodeRefs, g);
          ingestReferences(newReferences, documentEditorData.node.id);
          return content;
      }} onClose={() => setDocumentEditorData(null)} />}
      {showSystemsView && systemsViewData && mindMap && <SystemsViewModal data={systemsViewData} mindMap={mindMap} isLocked={systemsViewLocked} onToggleLock={() => setSystemsViewLocked(!systemsViewLocked)} onRegenerate={() => { setSystemsViewLocked(false); handleSystemsView(); }} onClose={() => setShowSystemsView(false)} onUpdate={(d) => setSystemsViewData(d)} onAddToMindMap={handleAddToMindMap} onOpenDetails={(n) => handleNodeAction('details', n)} onOpenProcess={(n) => handleNodeAction('process', n)} isDevMode={isDevMode} theme={theme} tuning={tuning} />}
      
      {/* Updated Details Modal */}
      {detailsContent && (
          <DetailsModal 
              title={detailsContent.title} 
              content={detailsContent.content} 
              isLocked={detailsContent.isLocked} 
              history={findNodeAndPath(mindMap, detailsContent.id)?.node.detailsHistory}
              challenges={findNodeAndPath(mindMap, detailsContent.id)?.node.challenges}
              onToggleLock={() => { 
                  const newState = !detailsContent.isLocked; 
                  updateNodeInTree(detailsContent.id, (n) => ({ ...n, detailsLocked: newState }), `Lock toggle`); 
                  setDetailsContent(prev => prev ? { ...prev, isLocked: newState } : null); 
              }} 
              onSave={(c) => { 
                  updateNodeInTree(detailsContent.id, (n) => ({ ...n, cachedDetails: c }), `Updated details`, true, true); 
                  setDetailsContent(prev => prev ? { ...prev, content: c } : null); 
              }} 
              onRefine={handleRefineDetails} 
              onChallenge={(text) => handleChallenge(detailsContent.id, text, 'details')}
              onGenerateCritiques={(count) => handleGenerateCritiques(detailsContent.id, 'details', count)}
              onClose={() => setDetailsContent(null)} 
          />
      )}
      
      {/* Updated Process Modal */}
      {processContent && (
          <ProcessModal 
              title={processContent.title} 
              steps={processContent.steps} 
              isLocked={processContent.isLocked} 
              startEditing={processContent.startEditing} 
              theme={theme}
              history={findNodeAndPath(mindMap, processContent.id)?.node.processHistory}
              challenges={findNodeAndPath(mindMap, processContent.id)?.node.challenges}
              onToggleLock={() => { 
                  const newState = !processContent.isLocked; 
                  updateNodeInTree(processContent.id, (n) => ({ ...n, processLocked: newState }), `Lock toggle`); 
                  setProcessContent(prev => prev ? { ...prev, isLocked: newState } : null); 
              }} 
              onSave={(s) => { 
                  updateNodeInTree(processContent.id, (n) => ({ ...n, cachedProcess: s }), `Updated process`, true, true); 
                  setProcessContent(prev => prev ? { ...prev, steps: s } : null); 
              }} 
              onRefine={handleRefineProcess} 
              onChallenge={(text) => handleChallenge(processContent.id, text, 'process')}
              onGenerateCritiques={(count) => handleGenerateCritiques(processContent.id, 'process', count)}
              onClose={() => setProcessContent(null)} 
          />
      )}
      
      {editNodeData && <EditNodeModal node={editNodeData.node} nodeNumber={editNodeData.number} onClose={() => setEditNodeData(null)} onSave={(u) => updateNodeInTree(editNodeData.node.id, (n) => ({ ...n, ...u }), `Edited node`, false, true)} onAddChild={() => { const newChild: MindMapData = { id: crypto.randomUUID(), label: "New Child", description: "User added", nodeType: 'info', nature: 'fact', source: 'user', children: [] }; updateNodeInTree(editNodeData.node.id, (n) => ({ ...n, children: [...(n.children || []), newChild] }), `Added child`); }} />}
      {expandNodeData && <ExpandModal node={expandNodeData} onClose={() => setExpandNodeData(null)} onConfirm={handleConfirmExpand} />}
      {activeInfoModal === 'userGuide' && <InfoModal title="User Guide" content={USER_GUIDE} onClose={() => setActiveInfoModal(null)} />}
      {activeInfoModal === 'techSpec' && <InfoModal title="Technical Specification" content={TECH_SPEC} onClose={() => setActiveInfoModal(null)} />}
      {activeInfoModal === 'history' && <HistoryModal history={history} currentIndex={historyIndex} onRestore={restoreFromHistory} onClose={() => setActiveInfoModal(null)} />}
      {activeInfoModal === 'logs' && <LogModal logs={logs} onClose={() => setActiveInfoModal(null)} />}
      {activeInfoModal === 'prompts' && <PromptLibraryModal onClose={() => setActiveInfoModal(null)} />}
    </div>
  );
};

export default App;
