
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MindMapData, TuningOptions, ProcessStep, SystemsViewData, ThesisCandidate, CandidateProfile, SystemActor, SystemInteraction, Reference } from "../types";
import { logger } from "../utils/logger";

const MODEL_NAME = "gemini-2.5-flash";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STANDARD_THESIS_REFS: Record<string, { citation: string, description: string }[]> = {
    "Introduction": [
        { citation: "Swales, J. M. (1990). Genre Analysis: English in Academic and Research Settings.", description: "Utilize the 'Create a Research Space' (CARS) model for this section." }
    ],
    "Literature Review": [
        { citation: "Boote, D. N., & Beile, P. (2005). Scholars before researchers.", description: "Criteria for a sophisticated, critical review of literature." }
    ],
    "Research Questions": [
        { citation: "Alvesson, M., & Sandberg, J. (2013). Constructing Research Questions: Doing Interesting Research.", description: "Framework for generating impactful research questions through problematization." }
    ],
    "Methodology": [
        { citation: "Creswell, J. W. (2014). Research Design: Qualitative, Quantitative, and Mixed Methods Approaches.", description: "Standard framework for structuring the research design and justification." }
    ],
    "Results & Analysis": [
        { citation: "Bem, D. J. (1987). Writing the empirical journal article.", description: "Guidelines for presenting data without interpretation (which belongs in Discussion)." }
    ],
    "Discussion": [
        { citation: "Hess, D. R. (2004). How to write an effective discussion.", description: "Structure for interpreting results, acknowledging limitations, and linking back to the introduction." }
    ],
    "Conclusion": [
        { citation: "Bunton, D. (2005). The structure of PhD conclusion chapters.", description: "Strategies for summarizing contributions and suggesting future research." }
    ]
};

const buildSystemInstruction = (tuning: TuningOptions, format: 'json' | 'markdown' | 'text' = 'json', profile?: CandidateProfile): string => {
  let instruction = `
    You are a Disciplined Research Assistant AI supporting a Candidate.
    
    Target Audience (Reader): ${tuning.readerRole || 'Academic Review Board'}.
    Persona: ${tuning.aiPersona || 'Disciplined Research Assistant'}.
    
    ${profile ? `
    CANDIDATE CONTEXT:
    - Degree Level: ${profile.degreeLevel}
    - Field: ${profile.fieldOfStudy}
    - Skills: ${profile.keySkills}
    - Career Goals: ${profile.careerGoals}
    ${profile.generalInfo ? `- Additional Context: ${profile.generalInfo}` : ''}
    
    Adjust all output tone and complexity to match the '${profile.degreeLevel}' level.
    ` : `
    Language Level: Doctoral Thesis / Academic Journal.
    `}
    
    Your goal is to structure complex research concepts into a rigorous, standardized Thesis format.
    Ensure all output maintains high academic standards, avoiding colloquialisms and ensuring logical flow.
  `;

  if (format === 'json') {
      instruction += `
    Output valid JSON only.`;
  } else if (format === 'markdown') {
      instruction += `
    Output structured Markdown. 
    CRITICAL: Do NOT include JSON, metadata, "suggested prompts", or "future actions" in your output. Only provide the requested content.`;
  } else {
      instruction += `
    Output plain text.`;
  }
  
  return instruction;
};

const formatReferencesForPrompt = (refs?: Reference[]): string => {
    if (!refs || refs.length === 0) return "";
    return `
    ATTACHED REFERENCE MATERIALS:
    The user has attached the following references to this specific section. 
    You MUST use these as primary conceptual inputs/methodological guides when generating the content.
    
    ${refs.map((r, i) => `${i+1}. "${r.citation}"\n   Context/Note: ${r.description || 'N/A'}`).join('\n')}
    `;
};

// Helper to format steps for prompts (Internal use)
const formatProcessStepsForPrompt = (steps: ProcessStep[]): string => {
    if (!steps || steps.length === 0) return "No process steps defined.";
    
    let text = "DEFINED PROCESS FLOW (Incorporate this workflow into the text):\n";
    steps.sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber)).forEach(s => {
        text += `Step ${s.stepNumber} [${s.action}] by ${s.role || 'User'}: ${s.description}\n`;
        if (s.type === 'decision' && s.branches) {
            text += `  > Decision Branches: ${s.branches.map(b => `${b.label} -> Step ${b.targetStepId ? 'Next' : 'Unknown'}`).join(', ')}\n`;
        }
    });
    return text;
};

const handleGeminiError = (error: any, context: string) => {
  logger.error(`Gemini Error [${context}]`, { message: error.message });
  console.error(error);
  if (error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
    throw new Error("QUOTA_EXCEEDED");
  }
};

// --- Reusable Schemas ---

const commonNodeProperties = {
    label: { type: Type.STRING, description: "Short, clear title of the section." },
    description: { type: Type.STRING, description: "Brief academic summary of this section." },
    nodeType: { type: Type.STRING, enum: ["process", "info"] },
    nature: { type: Type.STRING, enum: ["fact", "opinion"] },
    isProcessCandidate: { type: Type.BOOLEAN },
    suggestedPrompts: {
        type: Type.OBJECT,
        properties: {
            expand: { type: Type.STRING },
            details: { type: Type.STRING },
            process: { type: Type.STRING },
        }
    },
    references: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                citation: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING }
            }
        }
    }
};

// Leaf Node Schema (Terminates recursion depth with explicit properties)
const leafNodeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        ...commonNodeProperties,
        children: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        }
    },
    required: ["label", "description", "nodeType", "children"]
};

// Standard Node Schema (Used for immediate children, which can contain leaf nodes)
const nodeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        ...commonNodeProperties,
        children: { 
            type: Type.ARRAY, 
            items: leafNodeSchema 
        }
    },
    required: ["label", "description", "nodeType", "children"]
};

// Process Step Schema
const processStepSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            stepNumber: { type: Type.NUMBER },
            action: { type: Type.STRING, description: "Short title of the step" },
            description: { type: Type.STRING, description: "Detailed explanation" },
            role: { type: Type.STRING, description: "Who performs this step" },
            type: { type: Type.STRING, enum: ["action", "decision"] },
            isEndState: { type: Type.BOOLEAN },
            branches: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        targetStepId: { type: Type.STRING }
                    },
                    required: ["label"]
                }
            }
        },
        required: ["stepNumber", "action", "description", "type", "role"]
    }
};

// Schema for Content + References (Hybrid)
const contentWithRefsSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        markdownContent: { type: Type.STRING, description: "The main generated text content in Markdown format." },
        newReferences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    citation: { type: Type.STRING, description: "Full academic citation string." },
                    description: { type: Type.STRING, description: "Brief relevance note." },
                    url: { type: Type.STRING }
                },
                required: ["citation"]
            },
            description: "A list of ANY new academic references cited or created in the content."
        }
    },
    required: ["markdownContent"]
};

// Return type for content generators
export interface ContentWithReferences {
    content: string;
    newReferences: Reference[];
}

const parseContentResponse = (jsonStr: string): ContentWithReferences => {
    try {
        const json = JSON.parse(jsonStr);
        const content = json.markdownContent || "";
        const refs = (json.newReferences || []).map((r: any) => ({
            id: crypto.randomUUID(),
            citation: r.citation,
            description: r.description,
            url: r.url,
            source: 'ai' as const
        }));
        return { content, newReferences: refs };
    } catch (e) {
        logger.warn("Failed to parse JSON content response, fallback to raw text", { error: e });
        return { content: jsonStr, newReferences: [] };
    }
};

// --- Thesis Exploration ---
export const generateThesisCandidates = async (topic: string, tuning: TuningOptions, profile: CandidateProfile): Promise<ThesisCandidate[]> => {
    logger.info("Generating Thesis Candidates", { topic });
    const systemInstruction = buildSystemInstruction(tuning, 'json', profile);

    const prompt = `
      The Candidate (Researcher) has provided a broad research topic: "${topic}".
      
      Generate 3 distinct, viable Thesis candidates based on this topic.
      Each candidate should represent a different angle.
      
      For each candidate, provide a rigorous scoring analysis (0-10).
      
      **SCORING ADJUSTMENT RULES based on Candidate Profile:**
      - Feasibility: Score higher if the required methods match the Candidate's Skills (${profile.keySkills}). Score lower if there is a skills gap.
      - Career Alignment: Score higher if the topic matches the Candidate's Goals (${profile.careerGoals}).
      - Method Fit: Ensure the methodology fits the '${profile.degreeLevel}' requirements.
      - Ethical Complexity: High score = LOW complexity (easier ethical approval).

      **CRITICAL: Calculate 'overallScore' (0-100) using this weighting:**
      (Novelty * 3) + (Method Fit * 2.5) + (Publication Potential * 1.5) + (Advisor Fit * 1.0) + (Feasibility * 1.0) + (Ethical Complexity * 1.0) + (Career Alignment * 1.5)
      (Normalize to 100)
    `;

    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          thesisStatement: { type: Type.STRING },
          methodologyHint: { type: Type.STRING },
          scoring: {
            type: Type.OBJECT,
            properties: {
              clarity: { type: Type.NUMBER },
              novelty: { type: Type.NUMBER },
              feasibility: { type: Type.NUMBER },
              methodFit: { type: Type.NUMBER },
              dataAvailability: { type: Type.NUMBER },
              scope: { type: Type.NUMBER },
              advisorFit: { type: Type.NUMBER },
              publicationPotential: { type: Type.NUMBER },
              careerAlignment: { type: Type.NUMBER },
              ethicalComplexity: { type: Type.NUMBER },
              narrativeStrength: { type: Type.NUMBER },
              overallScore: { type: Type.NUMBER },
              strengths: { type: Type.STRING },
              concerns: { type: Type.STRING },
            },
            required: ["clarity", "novelty", "feasibility", "methodFit", "careerAlignment", "ethicalComplexity", "overallScore", "strengths", "concerns"]
          }
        },
        required: ["title", "thesisStatement", "methodologyHint", "scoring"]
      }
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        const jsonStr = response.text || "[]";
        let candidates = JSON.parse(jsonStr);
        // Ensure IDs
        candidates.forEach((c: any) => c.id = crypto.randomUUID());
        return candidates;
    } catch (error: any) {
        handleGeminiError(error, "Thesis Exploration");
        throw error;
    }
};

export const generateSeedText = async (idea: string, tuning: TuningOptions): Promise<string> => {
  logger.info("Generating Seed Text", { idea });
  const systemInstruction = buildSystemInstruction(tuning, 'text');
  
  const prompt = `
    Write a 1000-word preliminary research proposal on the topic: ${idea}.
    Structure the text so that it is clear, comprehensive, and useful as a basis for a later deep-dive.
    Output plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { systemInstruction }
    });
    const text = response.text || "";
    logger.success("Seed Text Generated", { length: text.length });
    return text;
  } catch (error: any) {
    handleGeminiError(error, "Seed Text Generation");
    throw error;
  }
};

export const generateMindMap = async (text: string, tuning: TuningOptions, profile?: CandidateProfile): Promise<MindMapData> => {
  logger.info("Generating Mind Map Structure");
  const systemInstruction = buildSystemInstruction(tuning, 'json', profile);
  
  const prompt = `
    Analyze the following research proposal/concept and generate the ROOT STRUCTURE for a Thesis.
    
    Context Text:
    "${text.substring(0, 30000)}"

    CRITICAL STRUCTURE REQUIREMENT:
    The root node must be the Thesis Title.
    The children of the root node MUST be the standard Thesis Chapters:
    1. Introduction
    2. Literature Review
    3. Research Questions
    4. Methodology
    5. Results & Analysis
    6. Discussion
    7. Conclusion
    
    **SELF-GUIDANCE FOR PROMPTS:**
    In the 'suggestedPrompts' field for each node, provide a specific follow-up question the user should ask to expand that section.
    Tailor this suggestion to the Candidate's skills (${profile?.keySkills || 'general'}).
    
    **REFERENCES:**
    For each node, if applicable, provide a 'references' array containing potential academic sources (books, papers, standard bodies).
    
    Output a JSON object matching the MindMapData interface. Ensure 'label' and 'description' are always populated.
  `;

  // Root Node Schema (Root contains children which use nodeSchema)
  const rootSchema: Schema = {
      type: Type.OBJECT,
      properties: {
          label: { type: Type.STRING },
          description: { type: Type.STRING },
          nodeType: { type: Type.STRING, enum: ["process", "info"] },
          nature: { type: Type.STRING, enum: ["fact", "opinion"] },
          isProcessCandidate: { type: Type.BOOLEAN },
          suggestedPrompts: {
              type: Type.OBJECT,
              properties: {
                  expand: { type: Type.STRING },
                  details: { type: Type.STRING },
                  process: { type: Type.STRING },
              }
          },
          children: {
              type: Type.ARRAY,
              items: nodeSchema // Reuse standard node schema for chapters
          },
          references: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    citation: { type: Type.STRING },
                    description: { type: Type.STRING },
                    url: { type: Type.STRING }
                }
            }
        }
      },
      required: ["label", "children"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: rootSchema
      }
    });
    
    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr) as MindMapData;
    
    const enrich = (node: MindMapData) => {
        if (!node.id) node.id = crypto.randomUUID();
        node.source = 'ai';
        
        // Inject Standard References for Core Nodes
        // We match loosely on the label containing the key words
        for (const [key, refs] of Object.entries(STANDARD_THESIS_REFS)) {
            if (node.label.includes(key)) {
                const existing = (node as any).references || [];
                // Merge, avoiding duplicates strictly
                const merged = [...existing];
                refs.forEach(stdRef => {
                    if (!merged.some((e: any) => e.citation === stdRef.citation)) {
                        merged.push(stdRef);
                    }
                });
                (node as any).references = merged;
            }
        }

        if (node.children) node.children.forEach(enrich);
    };
    enrich(data);

    logger.success("Mind Map Generated", { label: data.label });
    return data;
  } catch (error: any) {
    handleGeminiError(error, "Mind Map Generation");
    throw error;
  }
};

export const expandNode = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, guidance?: string, references?: Reference[]): Promise<MindMapData[]> => {
  logger.info("Expanding Node", { label });
  const systemInstruction = buildSystemInstruction(tuning, 'json');

  const prompt = `
    Context Path: ${contextPath.join(" > ")}
    Node to Expand: "${label}"
    Original Source Text Context: ...${fullText.substring(0, 5000)}...
    
    User Guidance: ${guidance || "Break this down into logical sub-components or steps."}
    ${formatReferencesForPrompt(references)}
    
    Generate a JSON array of children nodes (MindMapData[]) for this node.
    Do not include the parent node, only the children array.
    
    **SELF-GUIDANCE:**
    For each new child node, generate 'suggestedPrompts' that guide the user to the next logical research step.
    
    **REFERENCES:**
    Include real or plausible standard academic references for these new nodes if relevant to the topic.
    
    Order the returned children in a specific, logical sequence suitable for an academic thesis.
  `;

  // Schema for an Array of Nodes
  const expansionSchema: Schema = {
      type: Type.ARRAY,
      items: nodeSchema
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: expansionSchema
      }
    });
    
    const jsonStr = response.text || "[]";
    let children = JSON.parse(jsonStr);
    
    // Fallback if model returns object instead of array despite schema (rare)
    if (!Array.isArray(children) && (children as any).children) {
        children = (children as any).children;
    }
    
    children.forEach((c: any) => {
        c.id = crypto.randomUUID();
        c.source = 'ai';
    });

    logger.success("Node Expanded", { count: children.length });
    return children as MindMapData[];
  } catch (error: any) {
    handleGeminiError(error, "Expand Node");
    throw error;
  }
};

export const suggestReferences = async (label: string, contextPath: string[], description: string, userQuery?: string): Promise<Reference[]> => {
    logger.info("Suggesting References", { label });
    const systemInstruction = buildSystemInstruction({ readerRole: 'Academic', aiPersona: 'Librarian', detailLevel: 'PhD' }, 'json');

    const prompt = `
      Context Path: ${contextPath.join(" > ")}
      Topic: "${label}"
      Description: "${description}"
      ${userQuery ? `User Specific Request: "${userQuery}"` : ''}
      
      Generate a list of 3-5 high-quality academic references (Journal Articles, Books, Technical Standards) relevant to this specific topic.
      If the topic is niche, general standard text books or seminal papers are acceptable.
    `;

    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                citation: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING }
            },
            required: ["citation", "description"]
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        const refs = JSON.parse(response.text || "[]");
        return refs.map((r: any) => ({
            id: crypto.randomUUID(),
            citation: r.citation,
            description: r.description,
            url: r.url,
            source: 'ai'
        }));
    } catch (error: any) {
        handleGeminiError(error, "Suggest References");
        throw error;
    }
};

export const constructDetailsPrompt = (label: string, contextPath: string[], guidance?: string, processSteps?: ProcessStep[]) => {
    let prompt = `
    Context Path: ${contextPath.join(" > ")}
    Topic: "${label}"
    ${guidance ? `Specific Researcher Guidance: "${guidance}"` : ''}
    `;

    if (processSteps && processSteps.length > 0) {
        prompt += `
    \n${formatProcessStepsForPrompt(processSteps)}
    \nCRITICAL: The above process flow is a core part of this section. You MUST incorporate this workflow into the skeleton structure.
    `;
    }

    prompt += `
    Based on the context (and process if available), provide a comprehensive **Bullet Point Skeleton** for this section.
    
    STRUCTURE:
    - **Key Theoretical Concepts**: Definitions and framework used.
    - **Core Arguments/Points**: The main body of text, broken down logically.
    - **Data/Evidence Needed**: Placeholders for specific data points or experiments.
    - **References**: Integrate specific citations where specific claims are made.
    
    Goal: Maximize information density within ~500 words to guide the user in drafting the full text. 
    
    **OUTPUT REQUIREMENT**:
    Return a JSON object containing:
    1. 'markdownContent': The structured skeleton text.
    2. 'newReferences': An array of any academic references you cited in the text (citations).
  `;
  return prompt;
};

export const getNodeDetails = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, guidance?: string, references?: Reference[], processSteps?: ProcessStep[]): Promise<ContentWithReferences> => {
  logger.info("Generating Details", { label });
  // Note: 'json' mode here because we want structured data with refs, even though content is markdown.
  const systemInstruction = buildSystemInstruction(tuning, 'json'); 
  let prompt = constructDetailsPrompt(label, contextPath, guidance, processSteps);
  
  if (references && references.length > 0) {
      prompt += formatReferencesForPrompt(references);
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: contentWithRefsSchema
      }
    });
    return parseContentResponse(response.text || "{}");
  } catch (error: any) {
    handleGeminiError(error, "Get Node Details");
    throw error;
  }
};

export const refineNodeDetails = async (label: string, existingContent: string, contextPath: string[], fullText: string, tuning: TuningOptions, guidance: string, references?: Reference[], processSteps?: ProcessStep[]): Promise<ContentWithReferences> => {
    logger.info("Refining Details", { label });
    const systemInstruction = buildSystemInstruction(tuning, 'json');
    
    let prompt = `
        Context Path: ${contextPath.join(" > ")}
        Topic: "${label}"
        
        EXISTING CONTENT (SKELETON/DRAFT):
        """${existingContent}"""
        
        USER REFINEMENT INSTRUCTION:
        "${guidance}"
    `;

    if (processSteps && processSteps.length > 0) {
        prompt += `\n${formatProcessStepsForPrompt(processSteps)}\nEnsure the text reflects this process flow.`;
    }
        
    prompt += `
        TASK:
        Rewrite and refine the existing content to incorporate the user's instruction.
        Maintain the bullet-point skeleton format unless instructed otherwise.
        
        **OUTPUT REQUIREMENT**:
        Return a JSON object containing:
        1. 'markdownContent': The refined text.
        2. 'newReferences': An array of any NEW references added during refinement.
    `;

    if (references && references.length > 0) {
        prompt += formatReferencesForPrompt(references);
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: contentWithRefsSchema
            }
        });
        return parseContentResponse(response.text || "{}");
    } catch (error: any) {
        handleGeminiError(error, "Refine Node Details");
        throw error;
    }
};

export const respondToChallenge = async (label: string, contextPath: string[], currentContent: string, challenge: string, tuning: TuningOptions, references?: Reference[]): Promise<string> => {
    logger.info("Responding to Challenge", { label });
    // Use the "Assistant" or "Defending Candidate" persona here, NOT the Board.
    const systemInstruction = buildSystemInstruction(tuning, 'markdown');
    
    let prompt = `
        ACT AS: The Researcher / Candidate defending their thesis.
        
        CONTEXT: ${contextPath.join(" > ")}
        TOPIC: "${label}"
        
        CURRENT SECTION CONTENT:
        """${currentContent.substring(0, 5000)}"""
        
        ACADEMIC REVIEW BOARD CHALLENGE:
        "${challenge}"
        
        TASK:
        Provide a rigorous academic response to this challenge.
        1. Acknowledge the point raised by the Board.
        2. Defend the current content logic OR accept the critique and explain how it could be improved.
        3. Do NOT rewrite the content in this response. Provide the rationale only.
        
        Output Markdown.
    `;

    if (references && references.length > 0) {
        prompt += formatReferencesForPrompt(references);
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "";
    } catch (error: any) {
        handleGeminiError(error, "Challenge Response");
        throw error;
    }
};

export const generateCritiques = async (label: string, contextPath: string[], content: string, count: number, tuning: TuningOptions): Promise<string[]> => {
    logger.info("Generating Critiques", { label, count });
    // Override the default "Assistant" instruction to ensure a strict "Board" persona
    const systemInstruction = `
        You are a Strict Academic Review Board Member reviewing a Doctoral Thesis.
        You are critical, demanding, and focused on methodology, rigor, and validity.
        You are NOT the candidate's friend.
    `;
    
    const prompt = `
        CONTEXT: ${contextPath.join(" > ")}
        TOPIC: "${label}"
        
        CONTENT TO REVIEW:
        """${content.substring(0, 8000)}"""
        
        TASK:
        Generate ${count} critical, probing, and rigorous challenge questions regarding this content.
        Focus on:
        - Methodology weak points
        - Logical gaps or leaps
        - Lack of evidence citation
        - Theoretical inconsistencies
        - Scope creep or lack of focus
        
        OUTPUT:
        A JSON array of strings. Each string is one critique.
    `;

    const schema: Schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        const result = JSON.parse(response.text || "[]");
        return result.map((s: any) => String(s));
    } catch (error: any) {
        handleGeminiError(error, "Generate Critiques");
        throw error;
    }
};

export const constructProcessPrompt = (label: string, contextPath: string[], contextDetails?: string, guidance?: string) => {
    return `
    Context: ${contextPath.join(" > ")}
    Task: "${label}"
    Additional Context: ${contextDetails || ""}
    ${guidance ? `Specific Researcher Guidance: "${guidance}"` : ''}
    
    Generate a step-by-step process flow for this task.
    Output a JSON array of ProcessStep objects.
  `;
};

export const generateProcessFlow = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, contextDetails?: string, guidance?: string, references?: Reference[]): Promise<ProcessStep[]> => {
  logger.info("Generating Process Flow", { label });
  const systemInstruction = buildSystemInstruction(tuning, 'json');
  let prompt = constructProcessPrompt(label, contextPath, contextDetails, guidance);
  
  if (references && references.length > 0) {
      prompt += formatReferencesForPrompt(references);
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: processStepSchema // Enforce Schema
      }
    });
    let steps = JSON.parse(response.text || "[]");
    steps.forEach((s: any) => { if(!s.id) s.id = crypto.randomUUID(); });
    return steps as ProcessStep[];
  } catch (error: any) {
    handleGeminiError(error, "Process Flow Generation");
    throw error;
  }
};

export const refineProcessFlow = async (label: string, existingSteps: ProcessStep[], contextPath: string[], fullText: string, tuning: TuningOptions, guidance: string, references?: Reference[]): Promise<ProcessStep[]> => {
    logger.info("Refining Process Flow", { label });
    const systemInstruction = buildSystemInstruction(tuning, 'json');
    
    let prompt = `
        Context: ${contextPath.join(" > ")}
        Task: "${label}"
        
        EXISTING PROCESS STEPS (JSON):
        ${JSON.stringify(existingSteps)}
        
        USER REFINEMENT INSTRUCTION:
        "${guidance}"
        
        TASK:
        Modify the existing process steps to adhere to the user's instruction.
        You can add, remove, or edit steps and branches.
        Ensure the output is a valid JSON array of ProcessStep objects.
        Retain UUIDs for unchanged steps if possible, or generate new ones.
    `;

    if (references && references.length > 0) {
        prompt += formatReferencesForPrompt(references);
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: processStepSchema // Enforce Schema
            }
        });
        let steps = JSON.parse(response.text || "[]");
        steps.forEach((s: any) => { if(!s.id) s.id = crypto.randomUUID(); });
        return steps as ProcessStep[];
    } catch (error: any) {
        handleGeminiError(error, "Refine Process Flow");
        throw error;
    }
};

export const generateSystemsView = async (text: string, tuning: TuningOptions): Promise<SystemsViewData> => {
  logger.info("Generating Systems View");
  const systemInstruction = buildSystemInstruction(tuning, 'json');

  const prompt = `
    Analyze the text and extract the System Architecture specifically related to the Thesis Topic.
    Identify all Actors (People, Systems, External Entities) and their Interactions.
    
    Context Text: ${text.substring(0, 30000)}
  `;

  const schema: Schema = {
      type: Type.OBJECT,
      properties: {
          actors: { 
              type: Type.ARRAY, 
              items: {
                  type: Type.OBJECT,
                  properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["person", "system", "external"] },
                      userContext: { type: Type.STRING }
                  },
                  required: ["id", "name", "type"]
              }
          },
          activities: { type: Type.ARRAY, items: { type: Type.STRING } },
          interactions: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      id: { type: Type.STRING },
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      activity: { type: Type.STRING },
                      data: { type: Type.STRING },
                      userContext: { type: Type.STRING }
                  },
                  required: ["source", "target", "activity", "data"]
              }
          }
      },
      required: ["actors", "interactions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
         systemInstruction,
         responseMimeType: "application/json",
         responseSchema: schema
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    if(data.interactions) {
        data.interactions.forEach((i: any) => { if(!i.id) i.id = crypto.randomUUID(); });
    }
    return data as SystemsViewData;
  } catch (error: any) {
    handleGeminiError(error, "Systems View Generation");
    throw error;
  }
};

export const generateSequenceDiagram = async (
    interaction: { sourceName: string, targetName: string, activity: string, data: string, sourceContext?: string, targetContext?: string, interactionContext?: string }, 
    fullText: string, 
    tuning: TuningOptions
): Promise<string> => {
    logger.info("Generating Sequence Diagram", { activity: interaction.activity });
    const systemInstruction = buildSystemInstruction(tuning, 'text');

    const prompt = `
      Context Text: ...${fullText.substring(0, 10000)}...
      
      Focus Interaction:
      Source: ${interaction.sourceName} ${interaction.sourceContext ? `(Note: ${interaction.sourceContext})` : ''}
      Target: ${interaction.targetName} ${interaction.targetContext ? `(Note: ${interaction.targetContext})` : ''}
      Activity: ${interaction.activity}
      Data Payload: ${interaction.data}
      Interaction Context: ${interaction.interactionContext || 'None'}
      
      Generate a Mermaid.js sequence diagram code block that visualizes this specific interaction.
      CRITICAL INSTRUCTIONS:
      1. Expand the sequence to include likely preceding steps (setup) and succeeding steps (response/ack).
      2. INCORPORATE THE USER CONTEXT NOTES provided above into the logic or notes of the diagram.
      3. Use standard Mermaid 'sequenceDiagram' syntax.
      4. Output raw mermaid code only.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { systemInstruction }
        });
        
        let code = response.text || "";
        code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        return code;
    } catch (error: any) {
        handleGeminiError(error, "Sequence Diagram Generation");
        throw error;
    }
};

export const constructSummaryPrompt = (label: string, details?: string, processSteps?: ProcessStep[], guidance?: string) => {
    const hasProcess = processSteps && processSteps.length > 0;
    
    let prompt = `
    Target Node: "${label}"
    
    AVAILABLE SOURCE MATERIAL:
    
    1. AI Generated Details:
    """${details || 'No detailed explanation available.'}"""
    
    2. Process Workflow Data:
    """${hasProcess ? formatProcessStepsForPrompt(processSteps) : 'No process defined.'}"""
    
    ${guidance ? `
    3. USER DRAFT / GUIDANCE (High Priority):
    """${guidance}"""
    ` : ''}
    
    TASK:
    Write a cohesive, academic "Document Section Summary".
    
    INSTRUCTIONS:
    - Synthesize the "AI Generated Details" and "Process Workflow Data" into a single narrative.
    - ${guidance ? 'incorporate the "USER DRAFT/GUIDANCE" as the primary direction or core content.' : 'Create a polished summary.'}
    - If Process Data exists, you MUST describe the workflow steps in the narrative (e.g., "The methodology proceeds by..."). Do not just list them; weave them into the text.
    - Tone: Formal, Academic, Precise.
    
    **OUTPUT REQUIREMENT**:
    Return a JSON object containing:
    1. 'markdownContent': The summary text.
    2. 'newReferences': An array of any new references cited in the summary.
    `;
    return prompt;
};

export const generateNodeSummary = async (label: string, details?: string, processSteps?: ProcessStep[], tuning?: TuningOptions, references?: Reference[], guidance?: string): Promise<ContentWithReferences> => {
    logger.info("Generating Node Summary", { label });
    const systemInstruction = buildSystemInstruction(tuning || { readerRole: 'Academic', aiPersona: 'Research Assistant', detailLevel: 'PhD' }, 'json');
    let prompt = constructSummaryPrompt(label, details, processSteps, guidance);
    
    if (references && references.length > 0) {
        prompt += formatReferencesForPrompt(references);
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction, 
                responseMimeType: "application/json",
                responseSchema: contentWithRefsSchema
            }
        });
        return parseContentResponse(response.text || "{}");
    } catch (error: any) {
        handleGeminiError(error, "Node Summary Generation");
        throw error;
    }
};
