
# ThesisForge - Intelligent Research Architect

## Overview
**ThesisForge** is a specialized AI-powered research companion designed to guide Doctoral and Master's candidates from initial concept to a rigorous, fully structured thesis roadmap. 

Unlike generic mind-mapping tools, ThesisForge enforces strict academic standards. Powered by **Google's Gemini 2.5 Flash** model, it acts as a **Disciplined Research Assistant**, helping you brainstorm viable thesis angles, score their feasibility against your profile, and automatically generate the standard 7-chapter academic structure (Introduction, Literature Review, Research Questions, Methodology, Results, Discussion, Conclusion).

<img width="1159" height="856" alt="Screenshot 2025-11-28 003228" src="https://github.com/user-attachments/assets/7e720667-21bf-4576-8ff3-05770bd28fa0" />

---

## ⚡ Key Features

### 🎓 Thesis Exploration Engine
*   **Candidate Generation**: Input a broad topic (e.g., "AI in Healthcare") and receive 3 distinct, viable thesis angles (e.g., Quantitative Analysis, System Design, Policy Review).
*   **Feasibility Scoring**: The AI evaluates each candidate based on Novelty, Ethical Complexity, Data Availability, and alignment with your specific **Candidate Profile** (Skills, Degree Level).

### 🧠 Structured Academic Roadmap
*   **Standardized Architecture**: Automatically builds the required academic tree: *Introduction -> Lit Review -> Research Questions -> Methodology -> Results -> Discussion -> Conclusion*.
*   **Recursive Expansion**: Drill down into any chapter to generate sub-sections, specific arguments, or theoretical frameworks based on context.
*   **Concept Cloud**: Visualize and filter your thesis by recurring themes and keywords.

### 📝 Academic Writer & Editor
*   **Skeleton Generation**: Ask the AI to draft high-density "Details" for any node, providing a bullet-point skeleton of key theoretical concepts, arguments, and data needs.
*   **Refinement**: Use specific prompts to refine tone, expand on specific points, or challenge the logic.
*   **Reference Manager**: AI-suggested academic citations (Books, Journals) relevant to specific sections, or manage your own library.

### 🔄 Methodology & Process Engineering
*   **Process Mapping**: Transform your "Methodology" chapter into visual flowcharts. Map out experimental protocols, data collection pipelines, or software algorithms.
*   **Visual Logic**: Support for decision gates, loops, and end-states to ensure your research design is robust.

### 🛡️ Rigor & Consistency
*   **Dependency Tracking**: Link nodes together (e.g., *Research Question 1* <-> *Conclusion*). If you change the question, the conclusion is flagged for review.
*   **AI Review Board**: Ask the AI to generate "Critiques" of your specific sections, simulating a tough thesis defense or supervisor review.

### 🌐 Systems Architecture (Technical Theses)
*   **Systems View**: For engineering/CS theses, generate high-level architecture diagrams identifying Actors, Systems, and Interactions.
*   **Sequence Diagrams**: Auto-generate Mermaid.js sequence diagrams to visualize complex technical interactions.

---

## 🚀 Installation and Setup in Google AI Studio

Follow these steps to download the code and run your own instance of the application in Google AI Studio.

### Prerequisites
1.  **Google Account**: You need a Google account to use Google AI Studio.
2.  **Gemini API Key**: The application requires your own Gemini API key to function.
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Click on "Get API key" in the top-left menu.
    *   Follow the instructions to create a new API key.
    *   **Copy and save this key.** You will need it in Step 3.

### Step 1: Download the Project
1.  Download the project files from the repository.
2.  Ensure you have the following file structure:
    *   `index.html`
    *   `index.tsx`
    *   `App.tsx`
    *   `types.ts`
    *   `metadata.json`
    *   `components/` (Folder containing all .tsx components)
    *   `services/` (Folder containing geminiService.ts)
    *   `utils/` (Folder containing utility scripts)
    *   `constants/` (Folder containing theme and docs)

### Step 2: Prepare the ZIP for AI Studio
This is the most important step. AI Studio requires the `index.html` file to be at the **root** of the zip file.

1.  Select **all** the project files and folders mentioned above.
2.  Right-click and choose:
    *   **Windows**: "Send to" > "Compressed (zipped) folder".
    *   **Mac**: "Compress [X] items".
3.  Rename the new ZIP file to something clear, like `thesis-forge-upload.zip`.

### Step 3: Upload and Run in AI Studio
1.  Go to the [Google AI Studio App Gallery](https://aistudio.google.com/app).
2.  Click **"Create new"** and select **"Zip upload"**.
3.  **Upload Your ZIP**: Select the `thesis-forge-upload.zip` file you created. AI Studio will build the project and launch the application.
4.  **Add Your API Key**:
    *   Once the project is loaded, locate the **"Secrets"** panel on the left-hand side (it looks like a key icon 🔑).
    *   Click "Add new secret".
    *   For the **Name**, enter `API_KEY` (this must be exact).
    *   For the **Value**, paste the Gemini API key you obtained in the Prerequisites step.
    *   Click Save.

Your application is now set up and ready to use!

---

## 🔒 Privacy & Architecture

*   **Client-Side Processing**: All file parsing, NLP analysis, and graph rendering happen in your browser.
*   **Stateless AI**: Text is sent to the Gemini API solely for processing. No data is stored on external servers to train models.
*   **Local Storage**: Your sessions are saved locally to your device as JSON files. No cloud login is required.

## ⚙️ Tech Stack

*   **Core**: React 19, TypeScript, Vite
*   **Visuals**: D3.js (Tree/Force layouts), Mermaid.js (Sequence/Flowcharts), Tailwind CSS.
*   **AI**: Google GenAI SDK (`@google/genai`).
