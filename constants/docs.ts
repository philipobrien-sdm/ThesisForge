
export const USER_GUIDE = `
# 📖 ThesisForge User Guide

**ThesisForge** is your intelligent, disciplined AI Research Assistant. It is designed to help Doctoral Candidates transform raw concepts into rigorously structured Thesis Roadmaps.

---

## 🚀 Workflow

### 1. Concept to Candidate
*   **Input**: Start by entering a broad topic (e.g., "AI in Healthcare").
*   **Exploration**: The AI acts as a brainstorming partner, generating 3 distinct Doctoral Thesis candidates with different angles (e.g., Qualitative, Quantitative, System Design).
*   **Selection**: Choose the candidate that best aligns with your research goals.

### 2. The Thesis Roadmap (Mind Map)
Once selected, ThesisForge generates a **Structured Roadmap** enforced to follow the standard Doctoral format:
1.  **Introduction**: Hypothesis and context.
2.  **Literature Review**: Existing knowledge gaps.
3.  **Methodology**: How the research will be conducted.
4.  **Results & Analysis**: Expected data interpretation.
5.  **Discussion**: Implications.
6.  **Conclusion**: Summary and contributions.

### 3. Deepening the Research
Click any node to access the Researcher Tools:
*   **Expand 🌿**: Break down a chapter into sub-sections or specific arguments.
*   **Details 📝**: Ask the AI to draft a rigorous academic explanation of that section.
*   **Process 🔄**: Map out research methodologies or experimental workflows (e.g., "Data Collection Protocol").
*   **Doc ✍️**: Write or auto-generate the official abstract/summary for that section.

---

## 🛠️ Advanced Tools

### Dependency Tracking 🛡️
Link your **Conclusion** to your **Results**. If you update the Results section later, the Conclusion node will flag itself for review, ensuring your thesis remains consistent.

### Systems Architecture 🌐
For technical theses, use the **Systems View** to generate high-level architecture diagrams of the systems involved in your research. It includes Table Views, Data Flow filtering, and Sequence Diagrams.

### Document Compilation 📄
Click **Export HTML Doc** to compile your entire roadmap—including all summaries, methodologies, and details—into a single formatted document ready for review.
`;

export const TECH_SPEC = `
# ⚙️ ThesisForge Technical Specification

**ThesisForge** is a specialized configuration of the MindMap AI engine, tuned specifically for Academic Research and Doctoral Thesis generation.

---

## 🧠 AI Persona Configuration

The AI backend (Gemini 2.5 Flash) is strictly configured with the following parameters:
*   **Role**: Academic Review Board
*   **Persona**: Disciplined Research Assistant
*   **Tone**: Doctoral / Academic Journal
*   **Structure**: Enforced 6-Chapter Thesis Standard

This ensures that all generated content—from mind map nodes to detailed explanations—maintains high academic rigor and avoids colloquialisms.

## 🏗️ Architecture

*   **Frontend**: React 19 + TypeScript + Vite.
*   **Visualization**: D3.js (Tree Layouts) & Mermaid.js (Process/Sequence Diagrams).
*   **AI Integration**: Google Gemini 2.5 Flash via \`@google/genai\`.
*   **State Management**: Local React State + Client-Side Persistence (JSON Export).

## 🔒 Data Privacy

ThesisForge runs entirely in your browser.
*   **No Database**: Your research ideas are never stored on our servers.
*   **Direct API**: Text is sent directly to Google Gemini for processing and returned immediately.
*   **Local Storage**: Your sessions are saved locally to your device as JSON files.
`;
