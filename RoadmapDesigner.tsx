/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Page, Project, SavedAsset, StoryConceptAsset, PrefillState, ItemAsset, SpriteAsset, MapConceptAsset } from './index'; 
import { GoogleGenAI } from '@google/genai';
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardList, BookText, Palette, ShieldCheck, Map as MapLucideIcon, ScrollText, Settings, CheckSquare, ArrowRight, Briefcase, Users, Ghost, Gem, MapPin, UserCircle, Link as LinkIcon, Sparkles } from 'lucide-react';

const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


interface RoadmapDesignerProps {
  navigateTo: (page: Page) => void;
  navigateToWithPrefill: (page: Page, data: string, field: string) => void;
  appName: string;
  projects: Project[]; 
  activeProjectId: string | null; 
  savedAssets: SavedAsset[];
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  setBatchStatus: React.Dispatch<React.SetStateAction<{ isActive: boolean; message: string; total: number; current: number }>>;
}

const roadmapSteps = [
  { id: 'story', title: '1. Define Story Concept', description: "Craft the narrative foundation, themes, and key plot points for your game.", page: 'story-generator', icon: BookText, status: 'todo' },
  { id: 'characters', title: '2. Design Characters & Sprites', description: "Create visual designs for your player characters, enemies, and NPCs.", page: 'home', icon: Palette, status: 'todo' },
  { id: 'items', title: '3. Create Items & Gear', description: "Generate weapons, armor, consumables, and other in-game items.", page: 'item-generator', icon: ShieldCheck, status: 'todo' },
  { id: 'maps', title: '4. Develop Map Concepts', description: "Outline level layouts, environments, and key geographical features.", page: 'map-generator', icon: MapLucideIcon, status: 'todo' },
  { id: 'systems', title: '5. Define RPG Systems', description: "Detail character stats, item affixes, spell mechanics, and other core RPG rules.", page: 'rpg-system-generator', icon: ScrollText, status: 'todo' },
];

interface ChecklistItem {
    text: string;
    type: 'character' | 'enemy' | 'item' | 'location';
    fullLine: string; // Store the full line for pre-filling
}

interface ParsedChecklist {
    characters: ChecklistItem[];
    enemies: ChecklistItem[];
    items: ChecklistItem[];
    locations: ChecklistItem[];
}

const parseChecklistFromStory = (storyContent: string | undefined): ParsedChecklist | null => {
    if (!storyContent) return null;
    const checklist: ParsedChecklist = { characters: [], enemies: [], items: [], locations: [] };
    const checklistSectionRegex = /### Project Creation Checklist([\s\S]*)/i;
    const checklistMatch = storyContent.match(checklistSectionRegex);
    if (!checklistMatch || !checklistMatch[1]) return checklist; // Return empty if no section

    const content = checklistMatch[1];
    const parseCategory = (categoryTitle: string, type: ChecklistItem['type'], targetArray: ChecklistItem[]) => {
        const categoryRegex = new RegExp(`#### ${categoryTitle}\\s*([\\s\S]*?)(?:####|###|$)`, 'i');
        const categoryMatch = content.match(categoryRegex);
        if (categoryMatch && categoryMatch[1]) {
            const itemsRegex = /\*\s*(.*?)(?=\n\*\s*|\n\n|\n?$)/g; // Match list items
            let itemMatch;
            while ((itemMatch = itemsRegex.exec(categoryMatch[1])) !== null) {
                const fullLine = itemMatch[1].trim();
                const nameMatch = fullLine.match(/^\*\*(.*?)\*\*:/);
                const text = nameMatch ? nameMatch[1] : fullLine.substring(0, 50) + (fullLine.length > 50 ? '...' : '');
                if (fullLine) { targetArray.push({ text, type, fullLine }); }
            }
        }
    };
    parseCategory('Key Characters', 'character', checklist.characters);
    parseCategory('Enemy Types', 'enemy', checklist.enemies);
    parseCategory('Significant Items/Gear', 'item', checklist.items);
    parseCategory('Key Locations', 'location', checklist.locations);
    return checklist;
};


export default function RoadmapDesigner({ navigateTo, navigateToWithPrefill, appName, projects, activeProjectId, savedAssets, setSavedAssets, setBatchStatus }: RoadmapDesignerProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string } | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const storyAsset = activeProject?.storyConceptId ? savedAssets.find(a => a.id === activeProject.storyConceptId && a.assetType === 'storyConcept') as StoryConceptAsset : null;
  const projectChecklist = parseChecklistFromStory(storyAsset?.content);


  useEffect(() => {
    const storedUser = localStorage.getItem('spriteForgeUser');
    if (storedUser) {
      const user = JSON.parse(storedUser); setIsLoggedIn(true); setCurrentUserEmail(user.email);
    }
  }, []);

  const handleLogin = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setLoginModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleSignup = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setSignupModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); };
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); };

  const handleChecklistItemClick = (item: ChecklistItem) => {
    let targetPage: Page, targetField: string;
    let prefillData = item.fullLine;
    const boldNameMatch = item.fullLine.match(/\*\*(.*?)\*\*:/);
    const colonNameMatch = item.fullLine.match(/^(.*?):/);
    if (boldNameMatch && boldNameMatch[1]) { prefillData = boldNameMatch[1].trim(); } 
    else if (colonNameMatch && colonNameMatch[1]) { prefillData = colonNameMatch[1].trim(); }

    switch (item.type) {
      case 'character': case 'enemy': targetPage = 'home'; targetField = 'spriteConcept'; break;
      case 'item': targetPage = 'item-generator'; targetField = 'itemTheme'; break;
      case 'location': targetPage = 'map-generator'; targetField = 'mapTheme'; break;
      default: return;
    }
    navigateToWithPrefill(targetPage, prefillData, targetField);
  };
  
  const handleBatchGenerate = async (items: ChecklistItem[], categoryName: string) => {
    setBatchStatus({ isActive: true, message: `Starting batch generation for ${categoryName}`, total: items.length, current: 0 });
    let currentCount = 0;

    for (const item of items) {
        currentCount++;
        setBatchStatus(prev => ({ ...prev, message: `Generating ${item.text}...`, current: currentCount }));
        
        try {
            switch (item.type) {
                case 'character':
                case 'enemy':
                    await generateAndSaveSprite(item.fullLine);
                    break;
                case 'item':
                    await generateAndSaveItem(item.fullLine);
                    break;
                case 'location':
                    await generateAndSaveMap(item.fullLine);
                    break;
            }
        } catch (e: any) {
            console.error(`Failed to generate item "${item.text}":`, e);
            // Optionally show an error to the user
        }
    }
    setBatchStatus({ isActive: false, message: '', total: 0, current: 0 });
  };

  const generateAndSaveSprite = async (concept: string) => {
    const prompt = `You are an expert 2D game asset designer. Generate a single, highly detailed text prompt for a game sprite. The sprite should be for: "${concept}". The perspective should be isometric. The output should be a single paragraph of descriptive text for an image generation model.`;
    const response = await ai.models.generateContent({ model: TEXT_MODEL_NAME, contents: prompt });
    const imagePrompt = response.text;
    
    const imgResponse = await ai.models.generateImages({ model: IMAGE_MODEL_NAME, prompt: imagePrompt, config: { numberOfImages: 1, outputMimeType: 'image/png' } });
    const imageUrl = `data:image/png;base64,${imgResponse.generatedImages[0].image.imageBytes}`;

    const newAsset: SpriteAsset = {
        id: `sprite-batch-${Date.now()}`, timestamp: Date.now(), name: concept.split('-')[0].replace(/\*\*/g, '').trim(), assetType: 'sprite', imageUrl,
        variantKey: 'default', spriteConcept: concept, prompt: imagePrompt, gameGenre: activeProject?.gameGenre || 'rpg', gamePerspective: 'isometric', projectId: activeProjectId || undefined
    };
    setSavedAssets(prev => [...prev, newAsset]);
  };
    
  const generateAndSaveItem = async (concept: string) => {
    const prompt = `You are an expert 2D game asset designer. Generate a single, highly detailed text prompt for a game item sprite. The item is: "${concept}". The perspective should be isometric. The output should be a single paragraph of descriptive text for an image generation model, suitable for an item icon.`;
    const response = await ai.models.generateContent({ model: TEXT_MODEL_NAME, contents: prompt });
    const imagePrompt = response.text;

    const imgResponse = await ai.models.generateImages({ model: IMAGE_MODEL_NAME, prompt: imagePrompt, config: { numberOfImages: 1, outputMimeType: 'image/png' } });
    const imageUrl = `data:image/png;base64,${imgResponse.generatedImages[0].image.imageBytes}`;

    const newAsset: ItemAsset = {
        id: `item-batch-${Date.now()}`, timestamp: Date.now(), name: concept.split(':')[0].replace(/\*\*/g, '').trim(), assetType: 'item', imageUrl, variantKey: 'default',
        itemConcept: concept, prompt: imagePrompt, itemCategory: 'misc_loot', itemType: 'quest_item', gamePerspective: 'isometric', projectId: activeProjectId || undefined
    };
    setSavedAssets(prev => [...prev, newAsset]);
  };

  const generateAndSaveMap = async (concept: string) => {
    const prompt = `You are an expert game level designer. Generate a detailed textual concept for a game map based on the idea: "${concept}". Output in Markdown.`;
    const response = await ai.models.generateContent({ model: TEXT_MODEL_NAME, contents: prompt });
    
    const newAsset: MapConceptAsset = {
        id: `map-batch-${Date.now()}`, timestamp: Date.now(), name: concept.split(':')[0].replace(/\*\*/g, '').trim(), assetType: 'mapConcept',
        mapTheme: concept, perspective: 'isometric', content: response.text, projectId: activeProjectId || undefined
    };
    setSavedAssets(prev => [...prev, newAsset]);
  };


  const renderChecklistCategory = (title: string, items: ChecklistItem[], icon: React.FC<any>) => {
    if (!items || items.length === 0) return null;
    const IconComponent = icon;
    return (
        <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--accent-gold)] mb-2 flex items-center justify-between">
                <div className="flex items-center"><IconComponent size={20} className="mr-2 opacity-80" /> {title}</div>
                <button onClick={() => handleBatchGenerate(items, title)} className="button-secondary !text-xs !px-3 !py-1.5 flex items-center gap-1.5" title={`Generate all ${title}`}><Sparkles size={14}/>Generate All</button>
            </h3>
            <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
                    <button key={`${item.type}-${index}`} onClick={() => handleChecklistItemClick(item)} className="button-tertiary !text-xs !px-3 !py-1.5 bg-[var(--bg-secondary)] hover:border-[var(--accent-gold)]/50 flex items-center gap-1.5" title={`Generate: ${item.fullLine}`}><LinkIcon size={12} />{item.text}</button>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />
      <main className="flex-grow w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <section aria-labelledby="roadmap-title">
          <h1 id="roadmap-title" className="h1-style text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">Game Design Roadmap</h1>
          {activeProject ? (<div className="text-center mb-6 p-3 bg-[var(--bg-secondary)] border border-[var(--accent-gold)] rounded-lg max-w-md mx-auto"><p className="text-sm text-[var(--text-placeholder)]">Current Project:</p><p className="text-lg font-semibold text-[var(--accent-gold)] flex items-center justify-center gap-2"><Briefcase size={18}/> {activeProject.name}</p></div>) 
          : (<div className="text-center mb-6 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg max-w-md mx-auto"><p className="text-sm text-[var(--text-secondary)]">No active project. Results will be saved globally.</p><button onClick={() => navigateTo('projects')} className="text-sm text-[var(--accent-gold)] hover:underline">Manage Projects</button></div>)}
          <p className="text-lg text-[var(--text-secondary)] text-center max-w-2xl mx-auto mb-10">Follow these steps to progressively build out the core concepts and assets for your game using SpriteForge's AI tools. {activeProject && projectChecklist && " Use the checklist below from your story to jumpstart asset creation!"}</p>
        </section>

        {activeProject && projectChecklist && (
            <section aria-labelledby="project-checklist-title" className="card-style mb-8">
                 <h2 id="project-checklist-title" className="h3-style mb-3 flex items-center"><CheckSquare size={24} className="mr-3 text-[var(--accent-gold)]" /> Project Creation Checklist</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Based on your project's story (<strong>{storyAsset?.name || 'Current Story'}</strong>), here are some key elements you might need to create. Click an item to go to the relevant tool with the concept pre-filled.</p>
                {renderChecklistCategory("Key Characters", projectChecklist.characters, UserCircle)}
                {renderChecklistCategory("Enemy Types", projectChecklist.enemies, Ghost)}
                {renderChecklistCategory("Significant Items/Gear", projectChecklist.items, Gem)}
                {renderChecklistCategory("Key Locations", projectChecklist.locations, MapPin)}
                {(projectChecklist.characters.length === 0 && projectChecklist.enemies.length === 0 && projectChecklist.items.length === 0 && projectChecklist.locations.length === 0) && (<p className="text-sm text-[var(--text-placeholder)]">The AI didn't generate a detailed checklist in the story, or it couldn't be parsed. You can still proceed with the tools below or regenerate the story with more specific instructions for a checklist.</p>)}
            </section>
        )}

        <section className="space-y-5">
          {roadmapSteps.map((step) => (
            <div key={step.id} className="card-style-interactive p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group">
              <div className="flex-shrink-0 w-12 h-12 bg-[var(--accent-gold)]/10 rounded-lg flex items-center justify-center text-[var(--accent-gold)] group-hover:bg-[var(--accent-gold)]/20 transition-colors"><step.icon size={26} /></div>
              <div className="flex-grow">
                <h2 className="h3-style !text-xl sm:!text-2xl mb-1 group-hover:text-[var(--accent-gold)] transition-colors">{step.title}</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-3 sm:mb-0">{step.description}</p>
              </div>
              <button onClick={() => navigateTo(step.page as Page)} className="button-secondary !px-5 !py-2.5 text-sm w-full sm:w-auto flex items-center justify-center group-hover:border-[var(--accent-gold-hover)] group-hover:text-[var(--accent-gold-hover)]" aria-label={`Go to ${step.title.split('. ')[1]}`} >Go to Tool <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></button>
            </div>
          ))}
        </section>
      </main>

      <footer className="w-full text-center p-6 border-t border-[var