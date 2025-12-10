/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Page, SavedAsset, StoryConceptAsset, Project, ConceptArtAsset } from './index'; // Added Project
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import { BookText, ChevronDown, Sparkles, Trash2, Palette, BoxSelect, Settings2, Download, XCircle, Info, LayoutGrid, Map, Save, Image as ImageIcon } from 'lucide-react';

const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface StoryGeneratorProps {
  navigateTo: (page: Page) => void;
  appName: string;
  savedAssets: SavedAsset[];
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  projects: Project[]; // Added
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; // Added
  activeProjectId: string | null; // Added
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>; // Added
  isCreatingProject: { isCreating: boolean, newProjectName: string | null }; // Added
  setIsCreatingProject: React.Dispatch<React.SetStateAction<{ isCreating: boolean, newProjectName: string | null }>>; // Added
  isStorageFull: boolean;
}

const gameGenreOptions: { value: string; label: string }[] = [
    { value: 'none', label: 'Select Game Genre...' },
    { value: 'rpg', label: 'RPG (Role-Playing Game)' },
    { value: 'fighting', label: 'Fighting Game' },
    { value: 'platformer', label: 'Platformer' },
    { value: 'space-shooter', label: 'Space Shooter' },
    { value: 'strategy', label: 'Strategy (RTS/TBS)' },
    { value: 'driving-racing', label: 'Driving / Racing' },
    { value: 'war-simulation', label: 'War Simulation (Military Tactics)' },
    { value: 'adventure', label: 'Adventure (Story-Driven)' },
    { value: 'puzzle', label: 'Puzzle Game' },
    { value: 'stealth', label: 'Stealth Action' },
    { value: 'survival', label: 'Survival Crafting' },
    { value: 'sports', label: 'Sports Game' },
    { value: 'horror', label: 'Horror (Survival/Psychological)'},
    { value: 'simulation', label: 'Simulation (Life/Management)'},
    { value: 'visual-novel', label: 'Visual Novel'},
    { value: 'interactive-fiction', label: 'Interactive Fiction'},
];

async function generateSingleImage(prompt: string): Promise<string> {
    const response = await ai.models.generateImages({
      model: IMAGE_MODEL_NAME,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    }
    throw new Error('No image generated.');
};

async function generateAIStoryConcept(genre: string, theme: string): Promise<string> {
  const selectedGenreInfo = gameGenreOptions.find(g => g.value === genre) || gameGenreOptions[0];
  const genreLabel = selectedGenreInfo.label;

  const prompt = `
You are an expert game writer and narrative designer.
Your task is to generate a compelling textual story concept for a video game.
Additionally, you will generate a "Project Creation Checklist" derived from the story.

**Target Game Genre:** ${genreLabel}
**Core Theme/Idea for the Story:** "${theme}"

Please structure your response using Markdown for clarity. Describe the following aspects of the story:

### 1. Logline / Elevator Pitch
   - A brief, attention-grabbing summary of the story (1-2 sentences).

### 2. Key Characters
   - **Protagonist:** (Name/Archetype, core motivation, defining trait)
   - **Antagonist/Main Obstacle:** (Name/Nature of threat, motivation/goal, relationship to protagonist, if applicable)
   - **Key Supporting Character (Optional):** (Name/Role, brief description, how they aid or complicate the protagonist's journey)

### 3. Setting Overview
   - Briefly describe the primary game world or location.
   - What is the general atmosphere or mood of this setting (e.g., wondrous, oppressive, decaying, futuristic)?

### 4. Basic Plot Outline
   - **Inciting Incident:** What kicks off the main story?
   - **Rising Action / Central Conflict:** Briefly describe the main challenges or journey the protagonist undertakes. What are the stakes?
   - **Potential Climax:** What could be a major turning point or confrontation?
   - **Possible Resolution/Themes Explored:** What is a potential outcome, and what underlying themes (e.g., courage, loss, discovery, moral ambiguity) might the story explore?

### 5. Genre-Specific Elements & Twists
   - How does the story align with common tropes or gameplay loops of the "${genreLabel}" genre? (e.g., For RPGs: quest structure, moral choices. For Adventure: puzzles, exploration. For Horror: suspense building, survival mechanics.)
   - Suggest one potential narrative twist or unique element that could make this story stand out.

---
### Project Creation Checklist

This checklist outlines key assets and elements that would need to be created based on the story above.

#### Key Characters
*   **Protagonist:** [Extract from Story - Name/Archetype] - [Extract from Story - Brief Description/Defining Trait]
*   **Antagonist:** [Extract from Story - Name/Archetype] - [Extract from Story - Brief Description/Goal]
*   **NPC:** [Extract from Story - Name/Role, if applicable] - [Extract from Story - Brief Description]

#### Enemy Types
*   [Suggest Enemy Type 1 based on story]: [Brief Description for visual/gameplay style]
*   [Suggest Enemy Type 2 based on story, if applicable]: [Brief Description for visual/gameplay style]

#### Significant Items/Gear
*   [Suggest Item 1 based on story context, e.g., protagonist's weapon]: [Brief Description and Purpose]
*   [Suggest Item 2 based on story context, e.g., key plot item]: [Brief Description and Purpose]

#### Key Locations
*   [Suggest Location 1 from Setting Overview]: [Brief Description of its visual style or key features for map design]
*   [Suggest Location 2 from Plot Outline, if different]: [Brief Description of its visual style or key features for map design]

---

Ensure the concept is imaginative, coherent, and provides a good foundation for developing a game narrative.
The story should feel engaging and suitable for the specified game genre.
The checklist items should directly correspond to elements discussed in the story sections.
`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Story Concept Generation Error:", error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}
function downloadFileFromUrl(url: string, fileName: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadTextFile(content: string, fileName: string, contentType: string = 'text/plain') {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

const markdownDisplayComponents: Components = {
  h1: ({node, ...props}) => <h1 className="font-display text-2xl font-bold my-3 text-[var(--accent-gold)] border-b border-[var(--border-color)] pb-1" {...props} />,
  h2: ({node, ...props}) => <h2 className="font-display text-xl font-semibold my-3 text-[var(--accent-gold)]" {...props} />,
  h3: ({node, ...props}) => <h3 className="font-display text-lg font-semibold mt-4 mb-2 text-[var(--text-primary)]" {...props} />,
  p: ({node, ...props}) => <p className="mb-3 text-[var(--text-secondary)] leading-relaxed" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 space-y-1 text-[var(--text-secondary)]" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-[var(--text-secondary)]" {...props} />,
  li: ({node, ...props}) => <li className="mb-1" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-[var(--text-primary)]" {...props} />,
  em: ({node, ...props}) => <em className="italic" {...props} />,
  code: ({ node, inline, className, children, ...props }: React.PropsWithChildren<CodeProps>) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <pre className={`bg-[var(--bg-primary)] p-3 rounded text-xs overflow-x-auto border border-[var(--border-color)] my-2`}>
        <code className={`language-${match[1]}`}>{children}</code>
      </pre>
    ) : (
      <code className={`${className || ''} bg-[var(--bg-primary)] text-red-400 px-1.5 py-0.5 rounded text-xs`} {...props}>
        {children}
      </code>
    );
  },
};


export default function StoryGenerator({ 
    navigateTo, appName, 
    savedAssets, setSavedAssets,
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    isCreatingProject, setIsCreatingProject,
    isStorageFull
}: StoryGeneratorProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string } | null>(null);

  const [selectedGameGenre, setSelectedGameGenre] = useState<string>('none');
  const [storyTheme, setStoryTheme] = useState<string>('');
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  const [lastSavedConcept, setLastSavedConcept] = useState<StoryConceptAsset | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('spriteForgeUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setIsLoggedIn(true);
      setCurrentUserEmail(user.email);
    }
  }, []);
  
  // If entering this page to create a story for a new project, clear previous generation
  useEffect(() => {
    if (isCreatingProject.isCreating) {
        setSelectedGameGenre('none');
        setStoryTheme('');
        setGeneratedStory(null);
        setHasGenerated(false);
    }
  }, [isCreatingProject.isCreating]);


  const handleLogin = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setLoginModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleSignup = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setSignupModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); };

  const handleGenerateStory = async () => {
    if (selectedGameGenre === 'none') {
      setErrorDetails({ title: "Game Genre Required", message: "Please select a game genre." });
      return;
    }
    if (!storyTheme.trim()) {
      setErrorDetails({ title: "Story Theme Required", message: "Please enter a theme or core idea for your story." });
      return;
    }

    setIsLoading(true);
    setGeneratedStory(null);
    setHasGenerated(true);
    setErrorDetails(null);
    setIllustrationUrl(null);
    setLastSavedConcept(null);

    try {
      const storyConcept = await generateAIStoryConcept(selectedGameGenre, storyTheme);
      setGeneratedStory(storyConcept);
    } catch (error: any) {
      console.error('Error generating story concept:', error);
      setErrorDetails({ title: "Story Generation Failed", message: `Could not generate story concept: ${error.message || 'Unknown error'}. Please try again.` });
      setGeneratedStory(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIllustrateConcept = async () => {
    if (!generatedStory) {
        setErrorDetails({title: "Error", message: "No concept text available to illustrate."});
        return;
    }
    setIsIllustrating(true);
    setIllustrationUrl(null);
    try {
        const prompt = `Concept art for a game, high quality digital painting, atmospheric, detailed. The scene is based on the elevator pitch of a story: "${storyTheme}". Additional details: ${generatedStory.substring(0, 500)}`;
        const imageUrl = await generateSingleImage(prompt);
        setIllustrationUrl(imageUrl);
    } catch(e: any) {
        setErrorDetails({title: "Illustration Failed", message: e.message});
    } finally {
        setIsIllustrating(false);
    }
  };
  
  const handleDownloadStory = () => {
    if (generatedStory) {
        const genreLabel = gameGenreOptions.find(g => g.value === selectedGameGenre)?.label.replace(/[^a-zA-Z0-9]/g, '') || 'story';
        const themeLabel = storyTheme.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'customtheme';
        const fileName = `story_concept_${genreLabel}_${themeLabel}.md`;
        downloadTextFile(generatedStory, fileName, 'text/markdown;charset=utf-8');
    }
  };

  const handleSaveStoryConcept = () => {
    if (isStorageFull) {
      setErrorDetails({ title: "Storage Full", message: "Cannot save story. Browser storage is full." });
      return;
    }
    if (!generatedStory || !storyTheme || selectedGameGenre === 'none') {
        setErrorDetails({ title: "Cannot Save", message: "No generated story or missing theme/genre to save." });
        return;
    }
    const newStoryAssetId = `story-${selectedGameGenre}-${Date.now()}`;
    const newStoryAsset: StoryConceptAsset = {
        id: newStoryAssetId, assetType: 'storyConcept', name: storyTheme || `Story Concept: ${selectedGameGenre}`, timestamp: Date.now(),
        storyTheme: storyTheme, genre: selectedGameGenre, content: generatedStory,
        projectId: isCreatingProject.isCreating ? `project-${Date.now()}-${Math.random().toString(36).substring(2,7)}` : activeProjectId || undefined,
    };
    setSavedAssets(prev => [...prev, newStoryAsset]);
    setLastSavedConcept(newStoryAsset); // Store for illustration linking

    if (isCreatingProject.isCreating && isCreatingProject.newProjectName) {
        const newProjectId = newStoryAsset.projectId!;
        const newProject: Project = {
            id: newProjectId, name: isCreatingProject.newProjectName, timestamp: Date.now(), storyConceptId: newStoryAssetId, gameGenre: selectedGameGenre,
            linkedAssetIds: { sprites: [], items: [], mapConcepts: [], rpgSystems: [] }
        };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newProjectId);
        setIsCreatingProject({ isCreating: false, newProjectName: null });
        navigateTo('roadmap-designer');
        return;
    }
  };

  const handleSaveIllustration = () => {
      if (!illustrationUrl || !lastSavedConcept || isStorageFull) {
          setErrorDetails({title: "Cannot Save", message: "Illustration or original concept not available."});
          return;
      }
      const newArtAsset: ConceptArtAsset = {
          id: `conceptArt-${lastSavedConcept.id}-${Date.now()}`, assetType: 'conceptArt', name: `Illustration for "${lastSavedConcept.name}"`, timestamp: Date.now(), imageUrl: illustrationUrl,
          prompt: `Illustration of: ${lastSavedConcept.name}`, sourceAssetId: lastSavedConcept.id, sourceAssetType: 'storyConcept', projectId: activeProjectId || undefined,
      };
      setSavedAssets(prev => [...prev, newArtAsset]);
      if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) {
                const currentArt = p.linkedAssetIds.conceptArt || [];
                return { ...p, linkedAssetIds: { ...p.linkedAssetIds, conceptArt: [...currentArt, newArtAsset.id] }};
            }
            return p;
        }));
    }
  };

  const isStorySaved = () => {
    if (!generatedStory) return false;
    return savedAssets.some(asset => asset.assetType === 'storyConcept' && (asset as StoryConceptAsset).content === generatedStory);
  };

  const isIllustrationSaved = () => {
      if (!illustrationUrl) return false;
      return savedAssets.some(asset => asset.assetType === 'conceptArt' && (asset as ConceptArtAsset).imageUrl === illustrationUrl);
  };

  const handleClearAll = () => {
    setSelectedGameGenre('none'); setStoryTheme(''); setGeneratedStory(null); setIsLoading(false); setHasGenerated(false);
    setErrorDetails(null); setIllustrationUrl(null); setLastSavedConcept(null);
    if(isCreatingProject.isCreating) { setIsCreatingProject({isCreating: false, newProjectName: null}); }
  };
  
  const mainContentDisabled = isLoading || isIllustrating;
  const storySavedToGlobalAssets = isStorySaved();
  const saveButtonText = isCreatingProject.isCreating ? 'Save Story & Create Project' : (storySavedToGlobalAssets ? 'Saved to Assets' : 'Save to Assets');
  const saveButtonDisabled = (storySavedToGlobalAssets && !isCreatingProject.isCreating) || mainContentDisabled || isStorageFull;
  const illustrationSaved = isIllustrationSaved();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />
      <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <section aria-labelledby="story-generator-title">
            <h1 id="story-generator-title" className="h1-style text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">AI Story Concept Generator</h1>
            {isCreatingProject.isCreating && isCreatingProject.newProjectName && (<p className="text-lg text-center text-[var(--accent-gold)] mb-1">Creating story for new project: <strong>{isCreatingProject.newProjectName}</strong></p>)}
            <p className="text-lg text-[var(--text-secondary)] text-center max-w-3xl mx-auto">Select a game genre, provide a core theme, and let AI help you craft compelling narrative ideas and a project checklist.</p>
          </section>

          <section aria-labelledby="story-configuration-heading" className="card-style">
            <h2 id="story-configuration-heading" className="h3-style mb-1 flex items-center"><Settings2 size={24} className="mr-3 text-[var(--accent-gold)]" /> Story Configuration</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Define the genre and core idea to shape your story concept.</p>
            <div className="space-y-5">
              <div>
                <label htmlFor="game-genre" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Game Genre</label>
                <div className="relative"><select id="game-genre" value={selectedGameGenre} onChange={(e) => setSelectedGameGenre(e.target.value)} className="form-select" disabled={mainContentDisabled}>{gameGenreOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div>
              </div>
              <div>
                <label htmlFor="story-theme" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Core Theme / Idea for Story</label>
                 <textarea id="story-theme" value={storyTheme} onChange={(e) => setStoryTheme(e.target.value)} placeholder="e.g., A lone wanderer discovers a hidden civilization. Or, a group of rebels fights against a dystopian regime." className="form-input min-h-[100px] resize-y" rows={4} aria-label="Story Theme or Core Idea" disabled={mainContentDisabled}/>
              </div>
            </div>
          </section>
          
          <section aria-label="Generation Actions" className="mt-6 space-y-3">
            <button type="button" onClick={handleGenerateStory} disabled={mainContentDisabled || selectedGameGenre === 'none' || !storyTheme.trim()} className="button-primary w-full !py-3.5 !text-lg flex items-center justify-center"><Sparkles size={22} className="mr-2.5" />Generate Story Concept</button>
            <button type="button" onClick={handleClearAll} disabled={mainContentDisabled} className="button-secondary w-full !py-3"><Trash2 size={20} className="mr-2.5" />Clear Inputs & Concept</button>
          </section>

          {(isLoading || isIllustrating) && (<section aria-live="polite" className="card-style text-center py-8"><div role="status" className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--accent-gold)] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" /><p className="mt-3 text-lg text-[var(--accent-gold)]">{isLoading ? 'Generating story concept...' : 'Illustrating concept...'}</p></section>)}

          {!isLoading && hasGenerated && generatedStory && (
            <section aria-labelledby="generated-story-concept-heading" className="card-style">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 id="generated-story-concept-heading" className="h3-style flex items-center mb-2 sm:mb-0"><BookText size={24} className="mr-3 text-[var(--accent-gold)]" /> Generated Story Concept</h2>
                <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={handleDownloadStory} className="button-tertiary !text-sm !px-4 !py-2 flex items-center"><Download size={16} className="mr-2" /> Download (.md)</button>
                    <button type="button" onClick={handleSaveStoryConcept} disabled={saveButtonDisabled} title={isStorageFull ? "Cannot save, storage is full" : (saveButtonDisabled && !mainContentDisabled ? "Already saved" : saveButtonText)} className={`button-tertiary !text-sm !px-4 !py-2 flex items-center ${storySavedToGlobalAssets && !isCreatingProject.isCreating && !isStorageFull ? '!text-green-500 hover:!bg-green-500/10' : ''}`}><Save size={16} className="mr-2" /> {saveButtonText}</button>
                </div>
              </div>
              <div className="prose-modals max-h-[70vh] overflow-y