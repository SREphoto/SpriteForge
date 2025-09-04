/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Page, SavedAsset, MapConceptAsset, Project, PrefillState, ConceptArtAsset } from './index'; // Added Project, PrefillState
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import { Map as MapIcon, ChevronDown, Sparkles, Trash2, Palette, BoxSelect, Settings2, Pen, Download, XCircle, Info, LayoutGrid, Save, Image as ImageIcon } from 'lucide-react';

const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface MapGeneratorProps {
  navigateTo: (page: Page) => void;
  navigateToWithPrefill: (page: Page, data: string, field: string) => void;
  appName: string;
  savedAssets: SavedAsset[]; 
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  projects: Project[]; 
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; 
  activeProjectId: string | null; 
  isStorageFull: boolean; 
  prefillState: PrefillState; 
  clearPrefillState: () => void;
}

type MapPerspectiveType = 'top-down' | 'side-scrolling' | 'isometric' | 'first-person' | 'none';

const mapPerspectiveOptions: { value: MapPerspectiveType; label: string; description: string; }[] = [
  { value: 'none', label: 'Select Map Perspective...', description: "Choose how the map will be viewed in a game." },
  { value: 'top-down', label: 'Top-Down / Overhead', description: "Viewed directly from above, like classic Zelda or RTS games." },
  { value: 'side-scrolling', label: 'Side-Scrolling', description: "Viewed from the side, common in platformers like Mario." },
  { value: 'isometric', label: 'Isometric (3/4 Overhead)', description: "Viewed from an angled top-down perspective, giving a pseudo-3D look." },
  { value: 'first-person', label: 'First-Person View', description: "Viewed from the character's eyes, like in FPS or immersive sims." },
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

async function generateAIMapConcept(perspective: MapPerspectiveType, theme: string, activeProjectStoryContext?: string): Promise<string> {
  const perspectiveInfo = mapPerspectiveOptions.find(p => p.value === perspective) || mapPerspectiveOptions[0];
  const perspectiveLabel = perspectiveInfo.label;
  const perspectiveDescription = perspectiveInfo.description;

  let prompt = `
You are an expert game level designer and environmental storyteller.
Your task is to generate a detailed textual concept for a game map.

**Target Game Perspective:** ${perspectiveLabel} (${perspectiveDescription})
**Map Theme/Core Idea:** "${theme}"
`;

  if (activeProjectStoryContext) {
    prompt += `\n**Overall Project Story Context:**\n${activeProjectStoryContext}\n(Use this story context to inform the map's theme, landmarks, and atmosphere to ensure it aligns with the broader narrative of the project.)\n`;
  }

  prompt += `
Please structure your response using Markdown for clarity. Describe the following aspects of the map:

### 1. Overall Layout & Key Zones
   - Describe the general structure, flow, and distinct areas or biomes within the map.
   - How does the chosen perspective influence the layout (e.g., linear paths for side-scrollers, open areas for top-down, interconnected rooms for first-person)?

### 2. Landmarks & Points of Interest
   - Highlight 3-5 significant or unique features, locations, or structures within the map.
   - What makes them stand out and potentially serve as objectives or focal points?

### 3. Environmental Elements & Features
   - Detail common environmental objects, terrain types (e.g., foliage, water bodies, specific ground textures), potential hazards (e.g., traps, chasms, enemy spawn areas), or interactive elements (e.g., doors, switches, climbable surfaces) appropriate for the theme and perspective.

### 4. Atmosphere & Visual Cues
   - Describe the intended mood and atmosphere (e.g., mysterious, dangerous, serene, bustling).
   - Suggest key visual elements like lighting conditions (e.g., dimly lit, bright daylight, neon glow), dominant color palettes, and overall art style direction (e.g., pixel art, cel-shaded, realistic).

### 5. Perspective-Specific Considerations
   - Briefly explain any other important design choices or gameplay implications directly tied to the "${perspectiveLabel}" view. For example:
     - For Top-Down: How are verticality or hidden areas handled?
     - For Side-Scrolling: What defines the boundaries of play? How is depth suggested?
     - For Isometric: How is navigation clarity maintained with the fixed angle?
     - For First-Person: What are key sightlines? How is spatial awareness guided?

Ensure the concept is imaginative, coherent, and provides a solid foundation for further visual development or level design.
The map should feel practical for a game.
`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Map Concept Generation Error:", error);
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


export default function MapGenerator({ 
    navigateTo, appName, 
    savedAssets, setSavedAssets, 
    projects, setProjects, activeProjectId, 
    isStorageFull, prefillState, clearPrefillState
}: MapGeneratorProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string } | null>(null);

  const [selectedPerspective, setSelectedPerspective] = useState<MapPerspectiveType>('none');
  const [mapTheme, setMapTheme] = useState<string>('');
  const [generatedConcept, setGeneratedConcept] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  const [lastSavedConcept, setLastSavedConcept] = useState<MapConceptAsset | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectStoryAsset = activeProject?.storyConceptId 
    ? savedAssets.find(a => a.id === activeProject.storyConceptId && a.assetType === 'storyConcept')
    : null;
  const projectStoryContext = activeProjectStoryAsset ? (activeProjectStoryAsset as any).content?.substring(0, 1000) + "..." : undefined;

  useEffect(() => {
    if (prefillState.targetPage === 'map-generator' && prefillState.data && prefillState.field === 'mapTheme') {
      setMapTheme(prefillState.data);
      clearPrefillState();
    }
  }, [prefillState, clearPrefillState]);

  useEffect(() => {
    const storedUser = localStorage.getItem('spriteForgeUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setIsLoggedIn(true);
      setCurrentUserEmail(user.email);
    }
  }, []);

  const handleLogin = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setLoginModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleSignup = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setSignupModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); };

  const handleGenerateConcept = async () => {
    if (selectedPerspective === 'none') {
      setErrorDetails({ title: "Perspective Required", message: "Please select a map perspective." });
      return;
    }
    if (!mapTheme.trim()) {
      setErrorDetails({ title: "Theme Required", message: "Please enter a theme or description for your map." });
      return;
    }

    setIsLoading(true);
    setGeneratedConcept(null);
    setHasGenerated(true);
    setErrorDetails(null);
    setIllustrationUrl(null);
    setLastSavedConcept(null);
    
    try {
      const concept = await generateAIMapConcept(selectedPerspective, mapTheme, projectStoryContext);
      setGeneratedConcept(concept);
    } catch (error: any) {
      console.error('Error generating map concept:', error);
      setErrorDetails({ title: "Concept Generation Failed", message: `Could not generate map concept: ${error.message || 'Unknown error'}. Please try again.` });
      setGeneratedConcept(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleIllustrateConcept = async () => {
    if (!generatedConcept) {
        setErrorDetails({title: "Error", message: "No concept text available to illustrate."});
        return;
    }
    setIsIllustrating(true);
    setIllustrationUrl(null);
    try {
        const prompt = `Concept art for a game, high quality digital painting, atmospheric, detailed. The scene is a ${selectedPerspective} view of: "${mapTheme}". Additional details: ${generatedConcept.substring(0, 500)}`;
        const imageUrl = await generateSingleImage(prompt);
        setIllustrationUrl(imageUrl);
    } catch(e: any) {
        setErrorDetails({title: "Illustration Failed", message: e.message});
    } finally {
        setIsIllustrating(false);
    }
  };

  const handleDownloadConcept = () => {
    if (generatedConcept) {
        const perspectiveLabel = mapPerspectiveOptions.find(p => p.value === selectedPerspective)?.label.replace(/[^a-zA-Z0-9]/g, '') || 'concept';
        const themeLabel = mapTheme.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'customtheme';
        const fileName = `map_concept_${perspectiveLabel}_${themeLabel}.md`;
        downloadTextFile(generatedConcept, fileName, 'text/markdown;charset=utf-8');
    }
  };

  const handleSaveMapConcept = () => {
    if (isStorageFull) {
      setErrorDetails({ title: "Storage Full", message: "Cannot save map concept. Browser storage is full." });
      return;
    }
    if (!generatedConcept || !mapTheme || selectedPerspective === 'none') {
        setErrorDetails({ title: "Cannot Save", message: "No generated concept or missing theme/perspective to save." });
        return;
    }
    const newMapAsset: MapConceptAsset = {
        id: `map-${selectedPerspective}-${Date.now()}`, assetType: 'mapConcept', name: mapTheme || `Map Concept: ${selectedPerspective}`, timestamp: Date.now(),
        mapTheme: mapTheme, perspective: selectedPerspective, content: generatedConcept, projectId: activeProjectId || undefined,
    };
    setSavedAssets(prev => [...prev, newMapAsset]);
    setLastSavedConcept(newMapAsset); // Store for illustration linking
    
    if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) {
                return { ...p, linkedAssetIds: { ...p.linkedAssetIds, mapConcepts: [...p.linkedAssetIds.mapConcepts, newMapAsset.id] }};
            }
            return p;
        }));
    }
  };

  const handleSaveIllustration = () => {
      if (!illustrationUrl || !lastSavedConcept || isStorageFull) {
          setErrorDetails({title: "Cannot Save", message: "Illustration or original concept not available."});
          return;
      }
      const newArtAsset: ConceptArtAsset = {
          id: `conceptArt-${lastSavedConcept.id}-${Date.now()}`, assetType: 'conceptArt', name: `Illustration for "${lastSavedConcept.name}"`, timestamp: Date.now(), imageUrl: illustrationUrl,
          prompt: `Illustration of: ${lastSavedConcept.name}`, sourceAssetId: lastSavedConcept.id, sourceAssetType: 'mapConcept', projectId: activeProjectId || undefined,
      };
      setSavedAssets(prev => [...prev, newArtAsset]);
  };

  const isConceptSaved = () => {
    if (!generatedConcept || !mapTheme || selectedPerspective === 'none') return false;
    return savedAssets.some(asset => asset.assetType === 'mapConcept' && (asset as MapConceptAsset).content === generatedConcept);
  };

  const isIllustrationSaved = () => {
      if (!illustrationUrl) return false;
      return savedAssets.some(asset => asset.assetType === 'conceptArt' && (asset as ConceptArtAsset).imageUrl === illustrationUrl);
  };

  const handleClearAll = () => {
    setSelectedPerspective('none'); setMapTheme(''); setGeneratedConcept(null); setIsLoading(false); setHasGenerated(false);
    setErrorDetails(null); setIllustrationUrl(null); setLastSavedConcept(null);
    clearPrefillState(); // Also clear prefill if user manually clears
  };
  
  const mainContentDisabled = isLoading || isIllustrating;
  const conceptSaved = isConceptSaved();
  const saveButtonDisabled = conceptSaved || mainContentDisabled || isStorageFull;
  const illustrationSaved = isIllustrationSaved();


  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />
      <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <section aria-labelledby="map-generator-title">
            <h1 id="map-generator-title" className="h1-style text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">AI Map Concept Generator</h1>
            {activeProject && (<div className="text-center text-sm text-[var(--accent-gold)] mb-3 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] max-w-md mx-auto">Working within project: <strong>{activeProject.name}</strong>{projectStoryContext && <p className="text-xs text-[var(--text-placeholder)] mt-1 truncate">Context: {projectStoryContext}</p>}</div>)}
            <p className="text-lg text-[var(--text-secondary)] text-center max-w-3xl mx-auto">Define a game perspective and theme, and let AI craft a detailed textual concept for your game map.</p>
          </section>

          <section aria-labelledby="map-configuration-heading" className="card-style">
            <h2 id="map-configuration-heading" className="h3-style mb-1 flex items-center"><Settings2 size={24} className="mr-3 text-[var(--accent-gold)]" /> Map Configuration</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Choose the game perspective and describe the theme or core idea for your map.</p>
            <div className="space-y-5">
              <div>
                <label htmlFor="map-perspective" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Game Perspective</label>
                <div className="relative"><select id="map-perspective" value={selectedPerspective} onChange={(e) => setSelectedPerspective(e.target.value as MapPerspectiveType)} className="form-select" disabled={mainContentDisabled} aria-describedby="map-perspective-description">{mapPerspectiveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div>
                {selectedPerspective !== 'none' && (<p id="map-perspective-description" className="text-xs text-[var(--text-placeholder)] mt-1.5">{mapPerspectiveOptions.find(opt => opt.value === selectedPerspective)?.description}</p>)}
              </div>
              <div>
                <label htmlFor="map-theme" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Map Theme / Core Idea</label>
                 <textarea id="map-theme" value={mapTheme} onChange={(e) => setMapTheme(e.target.value)} placeholder="e.g., A mysterious swamp with ancient, glowing flora and hidden dangers. Or, a bustling market square in a medieval fantasy city." className="form-input min-h-[100px] resize-y" rows={4} aria-label="Map Theme or Description" disabled={mainContentDisabled}/>
              </div>
            </div>
          </section>
          
          <section aria-label="Generation Actions" className="mt-6 space-y-3">
            <button type="button" onClick={handleGenerateConcept} disabled={mainContentDisabled || selectedPerspective === 'none' || !mapTheme.trim()} className="button-primary w-full !py-3.5 !text-lg flex items-center justify-center"><Sparkles size={22} className="mr-2.5" />Generate Map Concept</button>
            <button type="button" onClick={handleClearAll} disabled={mainContentDisabled} className="button-secondary w-full !py-3"><Trash2 size={20} className="mr-2.5" />Clear Inputs & Concept</button>
          </section>

          {(isLoading || isIllustrating) && (
            <section aria-live="polite" className="card-style text-center py-8">
              <div role="status" className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--accent-gold)] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-3 text-lg text-[var(--accent-gold)]">{isLoading ? 'Generating map concept...' : 'Illustrating concept...'}</p>
            </section>
          )}

          {!isLoading && hasGenerated && generatedConcept && (
            <section aria-labelledby="generated-map-concept-heading" className="card-style">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 id="generated-map-concept-heading" className="h3-style flex items-center mb-2 sm:mb-0"><MapIcon size={24} className="mr-3 text-[var(--accent-gold)]" /> Generated Map Concept</h2>
                <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={handleDownloadConcept} className="button-tertiary !text-sm !px-4 !py-2 flex items-center"><Download size={16} className="mr-2" /> Download (.md)</button>
                    <button type="button" onClick={handleSaveMapConcept} disabled={saveButtonDisabled} title={isStorageFull ? "Cannot save, storage is full" : (conceptSaved ? "Already saved" : "Save to Assets")} className={`button-tertiary !text-sm !px-4 !py-2 flex items-center ${conceptSaved && !isStorageFull ? '!text-green-500 hover:!bg-green-500/10' : ''}`}><Save size={16} className="mr-2" /> {conceptSaved ? 'Saved to Assets' : 'Save to Assets'}</button>
                </div>
              </div>
              <div className="prose-modals max-h-[70vh] overflow-y-auto bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-lg border border-[var(--border-color)]">
                 <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownDisplayComponents}>{generatedConcept}</ReactMarkdown>
              </div>
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                 <button onClick={handleIllustrateConcept} disabled={mainContentDisabled || !lastSavedConcept} className="button-secondary w-full mb-4" title={!lastSavedConcept ? "Save the text concept first to enable illustration" : "Illustrate Concept"}><ImageIcon size={18} className="mr-2"/>Illustrate Concept</button>
                 {illustrationUrl && (
                    <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                        <img src={illustrationUrl} alt="Generated map illustration" className="w-full h-auto rounded-md border border-[var(--border-color)]"/>
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => downloadFileFromUrl(illustrationUrl, `illustration_${lastSavedConcept?.name.replace(/ /g, '_')}.png`)} className="button-tertiary flex-1 !text-sm"><Download size={16} className="mr-2"/>Download Art</button>
                            <button onClick={handleSaveIllustration} disabled={isStorageFull || illustrationSaved} className={`button-tertiary flex-1 !text-sm ${illustrationSaved ? '!text-green-500' : ''}`}><Save size={16} className="mr-2"/>{illustrationSaved ? 'Saved' : 'Save Art'}</button>
                        </div>
                    </div>
                 )}
              </div>
            </section>
          )}
          
          {!isLoading && hasGenerated && !generatedConcept && !errorDetails && (<section className="text-center py-10 card-style"><XCircle size={48} className="mx-auto text-red-500 mb-3" /><h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">No Concept Generated</h2><p className="text-[var(--text-secondary)]">The AI did not produce a map concept. This might be a temporary issue. Please try again or adjust your theme.</p></section>)}

           <section aria-labelledby="quick-actions-heading" className="card-style mt-8">
             <h2 id="quick-actions-heading" className="h3-style mb-4 flex items-center"><Info size={24} className="mr-3 text-[var(--accent-gold)]" /> Quick Actions</h2>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('home')} disabled={mainContentDisabled}><Palette size={20} className="mr-2.5" /> Sprite Generator</button>
               <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('assets')} disabled={mainContentDisabled}><LayoutGrid size={20} className="mr-2.5" /> My Assets</button>
               <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('playground')} disabled={mainContentDisabled}><BoxSelect size={20} className="mr-2.5" /> Interactive Playground</button>
             </div>
           </section>
        </div>
      </main>
      <footer className="w-full text-center p-6 border-t border-[var(--border-color)] mt-12"><p className="text-sm text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} {appName}. AI Map Concept Generator.</p></footer>
      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}