
import { MindMapData, SystemsViewData, TuningOptions, AppTheme, AppSettings } from '../types';
import { DEFAULT_THEME } from './theme';

export const TUTORIAL_SESSION = {
  timestamp: "2025-11-27T13:27:00.524Z",
  sessionName: "Tutorial: Thesis Roadmap",
  originalText: "Tutorial Session Data",
  mindMap: {
    id: "root-thesis",
    label: "Thesis: Quantum Cryptography in Banking",
    description: "An analysis of the implementation challenges of QKD in legacy banking infrastructure.",
    nodeType: "info",
    nature: "fact",
    isProcessCandidate: false,
    suggestedPrompts: {
      expand: "Break down the core hypothesis.",
      details: "Draft the abstract.",
      process: ""
    },
    source: "ai",
    children: [
      {
        id: "ch-1",
        label: "1. Introduction",
        description: "Problem statement: Quantum computers threaten RSA encryption.",
        nodeType: "info",
        nature: "fact",
        source: "ai",
        children: []
      },
      {
        id: "ch-2",
        label: "2. Literature Review",
        description: "Review of BB84 protocol and current banking security standards.",
        nodeType: "info",
        nature: "fact",
        source: "ai",
        children: []
      },
      {
        id: "ch-3",
        label: "3. Methodology",
        description: "Simulation of QKD layer over standard fiber networks.",
        nodeType: "process",
        nature: "fact",
        isProcessCandidate: true,
        source: "ai",
        children: []
      }
    ]
  } as MindMapData,
  systemsView: null as SystemsViewData | null,
  tuning: {
    readerRole: "Academic Review Board",
    aiPersona: "Disciplined Research Assistant",
    detailLevel: "Doctoral Thesis"
  } as TuningOptions,
  theme: DEFAULT_THEME,
  settings: {
    reviewPrompts: false,
    autoSave: false
  } as AppSettings
};
