/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Part } from '@google/genai'; // Added Part
import { Page, SavedAsset, SpriteAsset, Project, PrefillState } from './index'; // Added Project, PrefillState
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import DescriptionPreview from './public/DescriptionPreview';
import { Palette, UploadCloud, Settings2, Sparkles, Download, Save, Trash2, ChevronDown, Info, Redo, Image as ImageIcon, PlusCircle, X, Film, Zap, RedoDot } from 'lucide-react';


const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_DESIGN_SETS = 3;

interface HomeProps {
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

export const gameGenreOptions: { value: string; label: string }[] = [
    { value: 'rpg', label: 'RPG' }, { value: 'fighting', label: 'Fighting' }, { value: 'platformer', label: 'Platformer' },
    { value: 'space-shooter', label: 'Space Shooter' }, { value: 'strategy', label: 'Strategy' }, { value: 'driving-racing', label: 'Driving/Racing' },
    { value: 'war-simulation', label: 'War Sim' }, { value: 'adventure', label: 'Adventure' }, { value: 'puzzle', label: 'Puzzle' },
    { value: 'stealth', label: 'Stealth' }, { value: 'survival', label: 'Survival' }, { value: 'sports', label: 'Sports' },
    { value: 'horror', label: 'Horror'}, {value: 'simulation', label: 'Simulation'}, { value: 'visual-novel', label: 'Visual Novel'},
];

export const gamePerspectiveOptions: { value: string; label: string }[] = [
    { value: 'side-scrolling', label: 'Side-Scrolling' }, { value: 'top-down', label: 'Top-Down' },
    { value: 'isometric', label: 'Isometric (3/4 Overhead)' }, { value: 'front-facing', label: 'Front-Facing (Character Lineup)' },
];

const variationTypeOptions = [
  { value: 'angle_change', label: 'Angle Change / Pose Shift' },
  { value: 'color_intensity_shift', label: 'Color Intensity / Shift' },
  { value: 'subtle_animation', label: 'Subtle Animation Hint' },
  { value: 'shadow_glow_effect', label: 'Shadow / Glow Effect' },
];

const rpgCharacterTypeOptions = [
    { value: 'player_character', label: 'Player Character' },
    { value: 'monster_enemy', label: 'Monster / Enemy' },
    { value: 'npc', label: 'NPC (Non-Player Character)' },
];

const animationStateOptions = [
    { value: 'idle', label: 'Idle' }, { value: 'walk_run', label: 'Walk / Run Cycle (Keyframe)' },
    { value: 'primary_attack', label: 'Primary Attack (Keyframe)' }, { value: 'secondary_attack', label: 'Secondary Attack / Ability (Keyframe)' },
    { value: 'cast_spell', label: 'Cast Spell / Use Skill (Keyframe)' }, { value: 'get_hit_hurt', label: 'Get Hit / Hurt (Keyframe)' },
    { value: 'block_parry', label: 'Block / Parry (Keyframe)' }, { value: 'jump_fall', label: 'Jump / Fall (Keyframe)' },
    { value: 'death', label: 'Death / Defeated (Keyframe)' }, { value: 'interact', label: 'Interact (Keyframe)' },
];

const defaultSystemPrompt = `
You are an expert 2D game asset designer. Your goal is to generate detailed text prompts for creating new sprites based on user specifications.
The generated sprites will have three variants: 'default', 'hover' (e.g., for UI selection), and 'active' (e.g., for a special state).

OUTPUT FORMAT:
You MUST strictly output a JSON object with the following structure:
{
  "spriteConcept": "A concise description of the sprite, incorporating its type, character details, game context, and any specific animation keyframe if provided.",
  "styleAnalysis": {
    "notes": "Brief notes on how to render this sprite based on the reference image (if any), art style guidance, and chosen perspective. Focus on visual characteristics like line work, shading, color palette, and overall aesthetic."
  },
  "variants": {
    "default": {
      "prompt": "A detailed, descriptive prompt for the 'default' state of the sprite. Describe its appearance, pose (or keyframe), clothing, equipment, colors, and key visual details, consistent with the chosen perspective and animation state."
    },
    "hover": {
      "prompt": "A detailed, descriptive prompt for the 'hover' state. This should be a distinct variation from the default. Apply the specific variation type instruction provided by the user."
    },
    "active": {
      "prompt": "A detailed, descriptive prompt for the 'active' state. This should be a distinct variation from both default and hover. Apply the specific variation type instruction."
    }
  }
}
`;

const animationSystemPrompt = `
You are an expert 2D game animator and sprite sheet designer.
Your task is to generate a series of detailed text prompts, one for each frame of a sprite animation sequence.

OUTPUT FORMAT:
You MUST strictly output a JSON object with the following structure:
{
  "spriteConcept": "A concise description of the character and the animation being performed.",
  "styleAnalysis": { "notes": "Brief notes on how to render this character and animation, considering the reference image (if any), art style, and perspective." },
  "animationPrompts": [
    { "frame": 1, "prompt": "Detailed prompt for the first frame of the animation sequence." },
    { "frame": 2, "prompt": "Detailed prompt for the second frame, describing the incremental change in pose and motion." },
    { "frame": 3, "prompt": "..." }
  ]
}

CONTEXT:
- Number of Frames: The user will specify the exact number of frames. Your "animationPrompts" array MUST have exactly this many entries.
- Animation State: The user will specify the animation (e.g., Walk Cycle, Attack). The prompts should create a smooth, looping (if applicable) sequence for this animation.
- Game Perspective: The prompts MUST describe the character from the correct perspective (e.g., Side-Scrolling, Isometric).

CRITICAL: The prompts for each frame must be consistent in character design, clothing, and style, changing only the pose and motion to create a fluid animation. Describe each frame as a small, logical step in the overall movement. For a walk cycle, ensure the last frame can smoothly transition back to the first.
`;


// Helper types
interface DescriptionJson {
  spriteConcept: string;
  styleAnalysis: { notes: string };
  variants?: {
    default: { prompt: string };
    hover: { prompt: string };
    active: { prompt: string };
  };
  animationPrompts?: { frame: number, prompt: string }[];
}


interface ImageUrls {
  default: string | null;
  hover: string | null;
  active: string | null;
}

interface DesignSet {
  id: number;
  variationType: string;
  customInstructions: string;
}

interface GeneratedDesign {
    id: number;
    description: DescriptionJson | null;
    imageUrls: ImageUrls;
    descriptionError: string | null;
    imageError: string | null;
    isGenerating: boolean;
}

interface AnimationSheetResult {
    description: DescriptionJson | null;
    stitchedImageUrl: string | null;
    frames: string[];
    descriptionError: string | null;
    imageError: string | null;
    isGenerating: boolean;
}

const Home: React.FC<HomeProps> = ({
  navigateTo,
  navigateToWithPrefill,
  appName,
  savedAssets,
  setSavedAssets,
  projects,
  setProjects,
  activeProjectId,
  isStorageFull,
  prefillState,
  clearPrefillState,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);

  // Generator State
  const [generationMode, setGenerationMode] = useState<'variants' | 'animation'>('variants');
  const [referenceImage, setReferenceImage] = useState<{ file: File | null, base64: string | null }>({ file: null, base64: null });
  const [spriteConcept, setSpriteConcept] = useState('');
  const [gameGenre, setGameGenre] = useState(gameGenreOptions[0].value);
  const [gamePerspective, setGamePerspective] = useState(gamePerspectiveOptions[0].value);
  const [rpgCharacterType, setRpgCharacterType] = useState(rpgCharacterTypeOptions[0].value);
  const [animationState, setAnimationState] = useState(animationStateOptions[0].value);
  const [frameCount, setFrameCount] = useState(4);
  
  const [designSets, setDesignSets] = useState<DesignSet[]>([{ id: 1, variationType: variationTypeOptions[0].value, customInstructions: '' }]);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [animationSheetResult, setAnimationSheetResult] = useState<AnimationSheetResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectStoryAsset = activeProject?.storyConceptId 
    ? savedAssets.find(a => a.id === activeProject.storyConceptId && a.assetType === 'storyConcept')
    : null;
  const projectStoryContext = activeProjectStoryAsset ? (activeProjectStoryAsset as any).content?.substring(0, 1000) + "..." : undefined;

   useEffect(() => {
    if (prefillState.targetPage === 'home' && prefillState.data && prefillState.field === 'spriteConcept') {
      setSpriteConcept(prefillState.data);
      clearPrefillState();
    }
  }, [prefillState, clearPrefillState]);


  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setReferenceImage({ file, base64 });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false });

  const handleUpdateDesignSet = (id: number, field: keyof Omit<DesignSet, 'id'>, value: string) => {
    setDesignSets(sets => sets.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const addDesignSet = () => {
    if (designSets.length < MAX_DESIGN_SETS) {
      setDesignSets(sets => [...sets, { id: Date.now(), variationType: variationTypeOptions[0].value, customInstructions: '' }]);
    }
  };
  
  const removeDesignSet = (id: number) => {
    setDesignSets(sets => sets.filter(s => s.id !== id));
  };

  const handleGenerate = async () => {
    if (!spriteConcept.trim()) {
      setErrorDetails({ title: "Input Required", message: "Please provide a sprite concept." });
      return;
    }
    setIsLoading(true);
    setGeneratedDesigns([]);
    setAnimationSheetResult(null);

    if (generationMode === 'variants') {
        await handleGenerateVariants();
    } else {
        await handleGenerateAnimationSheet();
    }

    setIsLoading(false);
    setGenerationStatus('');
  };

  const handleGenerateVariants = async () => {
    setGeneratedDesigns(designSets.map(ds => ({ id: ds.id, description: null, imageUrls: { default: null, hover: null, active: null }, descriptionError: null, imageError: null, isGenerating: true })));
    const imagePart: Part | null = referenceImage.base64 ? { inlineData: { mimeType: referenceImage.file!.type, data: referenceImage.base64 } } : null;

    for (const designSet of designSets) {
      setGenerationStatus(`Generating description for Design Set #${designSet.id}...`);
      try {
        const textParts = buildCommonTextParts();
        textParts.push({ text: `Custom Instructions: ${designSet.customInstructions || 'None'}` });
        textParts.push({ text: `Variation Type to apply: ${variationTypeOptions.find(o => o.value === designSet.variationType)?.label}` });
        
        const contents: Part[] = imagePart ? [...textParts, imagePart] : textParts;
        const result = await ai.models.generateContent({
          model: TEXT_MODEL_NAME, contents: { parts: contents }, config: { systemInstruction: defaultSystemPrompt, responseMimeType: 'application/json', temperature: 0.8 }
        });

        let jsonStr = result.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) jsonStr = match[2].trim();
        const description = JSON.parse(jsonStr) as DescriptionJson;
        setGeneratedDesigns(prev => prev.map(d => d.id === designSet.id ? { ...d, description } : d));

        setGenerationStatus(`Generating images for Design Set #${designSet.id}...`);

        if (!description.variants || !description.variants.default?.prompt || !description.variants.hover?.prompt || !description.variants.active?.prompt) {
          throw new Error("AI failed to return the required 'variants' structure with prompts. Please try again.");
        }

        const [defaultImg, hoverImg, activeImg] = await Promise.allSettled([
          generateSingleImage(description.variants.default.prompt), 
          generateSingleImage(description.variants.hover.prompt), 
          generateSingleImage(description.variants.active.prompt)
        ]);
        
        const imageUrls: ImageUrls = {
            default: defaultImg.status === 'fulfilled' ? defaultImg.value : null, hover: hoverImg.status === 'fulfilled' ? hoverImg.value : null, active: activeImg.status === 'fulfilled' ? activeImg.value : null
        };
        const imageErrors = [defaultImg, hoverImg, activeImg].filter(res => res.status === 'rejected').map(res => (res as PromiseRejectedResult).reason.message).join(', ');
        setGeneratedDesigns(prev => prev.map(d => d.id === designSet.id ? { ...d, imageUrls, imageError: imageErrors || null, isGenerating: false } : d));
      } catch (e: any) {
        console.error(`Error generating for set ${designSet.id}:`, e);
        setGeneratedDesigns(prev => prev.map(d => d.id === designSet.id ? { ...d, descriptionError: `Failed to generate: ${e.message}`, isGenerating: false } : d));
      }
    }
  };

  const handleGenerateAnimationSheet = async () => {
    setAnimationSheetResult({ description: null, stitchedImageUrl: null, frames: [], descriptionError: null, imageError: null, isGenerating: true });
    const imagePart: Part | null = referenceImage.base64 ? { inlineData: { mimeType: referenceImage.file!.type, data: referenceImage.base64 } } : null;
    
    try {
        setGenerationStatus('Generating animation prompts...');
        const textParts = buildCommonTextParts();
        textParts.push({ text: `Number of Frames: ${frameCount}`});

        const contents: Part[] = imagePart ? [...textParts, imagePart] : textParts;
        const result = await ai.models.generateContent({
          model: TEXT_MODEL_NAME, contents: { parts: contents }, config: { systemInstruction: animationSystemPrompt, responseMimeType: 'application/json', temperature: 0.8 }
        });

        let jsonStr = result.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) jsonStr = match[2].trim();
        const description = JSON.parse(jsonStr) as DescriptionJson;
        setAnimationSheetResult(prev => prev ? { ...prev, description } : null);

        if (!description.animationPrompts || description.animationPrompts.length === 0) {
            throw new Error("AI did not return any animation prompts.");
        }

        const generatedFrames: string[] = [];
        const imageErrors: string[] = [];
        for (let i = 0; i < description.animationPrompts.length; i++) {
            setGenerationStatus(`Generating frame ${i + 1} of ${description.animationPrompts.length}...`);
            try {
                const frameUrl = await generateSingleImage(description.animationPrompts[i].prompt);
                generatedFrames.push(frameUrl);
                 setAnimationSheetResult(prev => prev ? { ...prev, frames: [...generatedFrames] } : null);
            } catch (frameError: any) {
                imageErrors.push(`Frame ${i+1}: ${frameError.message}`);
            }
        }
        
        if (generatedFrames.length > 0) {
            setGenerationStatus('Stitching frames into sprite sheet...');
            const stitchedImage = await stitchImages(generatedFrames);
            setAnimationSheetResult(prev => prev ? { ...prev, stitchedImageUrl: stitchedImage, imageError: imageErrors.join('; ') || null, isGenerating: false } : null);
        } else {
             setAnimationSheetResult(prev => prev ? { ...prev, imageError: "No frames were generated successfully.", isGenerating: false } : null);
        }
    } catch(e: any) {
        console.error('Error generating animation sheet:', e);
        setAnimationSheetResult(prev => prev ? { ...prev, descriptionError: `Failed to generate: ${e.message}`, isGenerating: false } : null);
    }
  };

  const buildCommonTextParts = () => {
    const textParts = [
      { text: `Sprite Concept: ${spriteConcept}` },
      { text: `Game Genre: ${gameGenreOptions.find(o => o.value === gameGenre)?.label}` },
      { text: `Game Perspective: ${gamePerspectiveOptions.find(o => o.value === gamePerspective)?.label}` },
      { text: `Animation State: ${animationStateOptions.find(o => o.value === animationState)?.label}` },
    ];
    if (gameGenre === 'rpg') {
      textParts.push({ text: `RPG Character Type: ${rpgCharacterTypeOptions.find(o => o.value === rpgCharacterType)?.label}` });
    }
    if (projectStoryContext) {
        textParts.push({ text: `\n--- ACTIVE PROJECT STORY CONTEXT ---\n${projectStoryContext}\n--- Guideline: Use the story context to influence the sprite's theme and style.`});
    }
    return textParts;
  }
  
  const stitchImages = (base64Images: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Could not create canvas context"));

        const images = base64Images.map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        let loadedCount = 0;
        images.forEach(img => {
            img.onload = () => {
                loadedCount++;
                if (loadedCount === images.length) {
                    const firstImage = images[0];
                    canvas.width = firstImage.width * images.length;
                    canvas.height = firstImage.height;
                    
                    images.forEach((img, i) => {
                        ctx.drawImage(img, i * firstImage.width, 0);
                    });
                    
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = () => reject(new Error("Failed to load an image for stitching."));
        });
    });
  };

  const generateSingleImage = async (prompt: string): Promise<string> => {
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

  const handleSaveSprite = (design: GeneratedDesign, variantKey: 'default' | 'hover' | 'active') => {
    const imageUrl = design.imageUrls[variantKey];
    if (!design.description || !imageUrl || isStorageFull) return;

    const newSprite: SpriteAsset = {
      id: `sprite-${variantKey}-${Date.now()}`, timestamp: Date.now(), name: design.description.spriteConcept, assetType: 'sprite', imageUrl, variantKey, spriteConcept: design.description.spriteConcept,
      prompt: design.description.variants![variantKey].prompt, gameGenre, gamePerspective,
      rpgCharacterType: gameGenre === 'rpg' ? rpgCharacterType : undefined, animationState, projectId: activeProjectId || undefined,
    };
    setSavedAssets(prev => [...prev, newSprite]);
    
     if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) { return { ...p, linkedAssetIds: { ...p.linkedAssetIds, sprites: [...p.linkedAssetIds.sprites, newSprite.id] }}; } return p;
        }));
    }
  };

  const handleSaveAnimationSheet = () => {
    if (!animationSheetResult?.stitchedImageUrl || !animationSheetResult.description || isStorageFull) return;
    const { stitchedImageUrl, description } = animationSheetResult;

    const newSpriteSheetAsset: SpriteAsset = {
        id: `spritesheet-${animationState}-${Date.now()}`,
        timestamp: Date.now(),
        name: `${description.spriteConcept} (${animationStateOptions.find(o=>o.value===animationState)?.label})`,
        assetType: 'sprite',
        imageUrl: stitchedImageUrl,
        isAnimationSheet: true,
        animationType: animationStateOptions.find(o=>o.value===animationState)?.label,
        frameCount: description.animationPrompts?.length || frameCount,
        spriteConcept: description.spriteConcept,
        prompt: JSON.stringify(description.animationPrompts),
        gameGenre,
        gamePerspective,
        rpgCharacterType: gameGenre === 'rpg' ? rpgCharacterType : undefined,
        animationState,
        projectId: activeProjectId || undefined
    };
    setSavedAssets(prev => [...prev, newSpriteSheetAsset]);

    if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) { return { ...p, linkedAssetIds: { ...p.linkedAssetIds, sprites: [...p.linkedAssetIds.sprites, newSpriteSheetAsset.id] }}; } return p;
        }));
    }
  };
  
  const isSpriteSaved = (design: GeneratedDesign, variantKey: 'default' | 'hover' | 'active') => {
    const imageUrl = design.imageUrls[variantKey]; if (!imageUrl) return false;
    return savedAssets.some(asset => asset.assetType === 'sprite' && (asset as SpriteAsset).imageUrl === imageUrl);
  };
  
  const isAnimationSheetSaved = () => {
    if (!animationSheetResult?.stitchedImageUrl) return false;
    return savedAssets.some(asset => asset.assetType === 'sprite' && (asset as SpriteAsset).imageUrl === animationSheetResult.stitchedImageUrl);
  }

  const handleClearAll = () => {
    setReferenceImage({ file: null, base64: null }); setSpriteConcept(''); setGameGenre(gameGenreOptions[0].value); setGamePerspective(gamePerspectiveOptions[0].value);
    setDesignSets([{ id: 1, variationType: variationTypeOptions[0].value, customInstructions: '' }]); setGeneratedDesigns([]); setAnimationSheetResult(null);
    setIsLoading(false); setGenerationStatus(''); clearPrefillState();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header
        appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)}
        onLogoutClick={() => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); }} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo}
      />
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <section aria-labelledby="sprite-gen-title" className="mb-8">
            <h1 id="sprite-gen-title" className="h1-style text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">AI Sprite Generator</h1>
             {activeProject && (
                <div className="text-center text-sm text-[var(--accent-gold)] mb-3 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] max-w-md mx-auto">
                    Working within project: <strong>{activeProject.name}</strong>
                    {projectStoryContext && <p className="text-xs text-[var(--text-placeholder)] mt-1 truncate">Context: {projectStoryContext}</p>}
                </div>
            )}
            <p className="text-lg text-[var(--text-secondary)] text-center max-w-3xl mx-auto">
              Create 2D game sprites by providing a concept, an optional reference image for style, and game context.
            </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* --- CONFIGURATION PANEL --- */}
            <div className="card-style space-y-6">
                <h2 className="h3-style flex items-center"><Settings2 size={24} className="mr-3 text-[var(--accent-gold)]"/>Configuration</h2>
                
                {/* Mode Toggle */}
                <div className="p-1 bg-[var(--bg-secondary)] rounded-lg flex gap-1">
                    <button onClick={() => setGenerationMode('variants')} className={`flex-1 text-center py-2 rounded-md transition-colors text-sm font-semibold flex items-center justify-center gap-2 ${generationMode === 'variants' ? 'bg-[var(--accent-gold)] text-[var(--accent-gold-text-on-gold)] shadow' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}><Zap size={16}/> Static Variants</button>
                    <button onClick={() => setGenerationMode('animation')} className={`flex-1 text-center py-2 rounded-md transition-colors text-sm font-semibold flex items-center justify-center gap-2 ${generationMode === 'animation' ? 'bg-[var(--accent-gold)] text-[var(--accent-gold-text-on-gold)] shadow' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}><Film size={16}/> Animation Sheet</button>
                </div>

                {/* Reference Image */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reference Image (Optional)</label>
                  <div {...getRootProps()} className={`relative flex justify-center items-center w-full px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] hover:border-[var(--accent-gold)]/70'}`}>
                    <input {...getInputProps()} />
                    {referenceImage.base64 ? (<><img src={`data:${referenceImage.file?.type};base64,${referenceImage.base64}`} alt="Preview" className="max-h-32 rounded-md object-contain" /><button onClick={(e) => { e.stopPropagation(); setReferenceImage({ file: null, base64: null }); }} className="absolute top-2 right-2 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition-colors"><X size={16}/></button></>) : 
                    (<div className="text-center text-[var(--text-secondary)]"><UploadCloud size={32} className="mx-auto mb-2"/><p className="font-semibold text-sm">Drop image here or click to upload</p><p className="text-xs">Provides style guidance for the AI</p></div>)}
                  </div>
                </div>

                {/* Sprite Concept */}
                <div>
                  <label htmlFor="sprite-concept" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Sprite Concept</label>
                  <textarea id="sprite-concept" value={spriteConcept} onChange={e => setSpriteConcept(e.target.value)} placeholder="e.g., A brave knight in shining steel armor, holding a large shield." className="form-input min-h-[100px]" rows={4} disabled={isLoading}/>
                </div>
                
                {/* Game Context */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="game-genre" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Game Genre</label>
                        <div className="relative"><select id="game-genre" value={gameGenre} onChange={e => setGameGenre(e.target.value)} className="form-select" disabled={isLoading}>{gameGenreOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none"/></div>
                    </div>
                     <div>
                        <label htmlFor="game-perspective" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Game Perspective</label>
                        <div className="relative"><select id="game-perspective" value={gamePerspective} onChange={e => setGamePerspective(e.target.value)} className="form-select" disabled={isLoading}>{gamePerspectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none"/></div>
                    </div>
                </div>

                {/* RPG & Animation Common Section */}
                <div className={`p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-4 ${gameGenre === 'rpg' ? 'grid' : (generationMode === 'animation' ? 'grid' : 'hidden')}`}>
                    <div className={gameGenre === 'rpg' ? 'block' : 'hidden'}>
                        <label htmlFor="rpg-char-type" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">RPG Character Type</label>
                        <div className="relative"><select id="rpg-char-type" value={rpgCharacterType} onChange={e => setRpgCharacterType(e.target.value)} className="form-select !bg-[var(--bg-card)]" disabled={isLoading}>{rpgCharacterTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none"/></div>
                    </div>
                    <div className={generationMode === 'animation' || gameGenre === 'rpg' ? 'block' : 'hidden'}>
                        <label htmlFor="anim-state" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Animation State</label>
                        <div className="relative"><select id="anim-state" value={animationState} onChange={e => setAnimationState(e.target.value)} className="form-select !bg-[var(--bg-card)]" disabled={isLoading}>{animationStateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none"/></div>
                    </div>
                </div>
                
                {/* Mode-Specific Options */}
                {generationMode === 'variants' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-[var(--text-primary)]">Design Sets</h3>
                        {designSets.map((ds, index) => (
                          <div key={ds.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] relative">
                             {designSets.length > 1 && <button onClick={() => removeDesignSet(ds.id)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-500/10 rounded-full"><X size={18}/></button>}
                             <p className="font-semibold text-[var(--accent-gold)] mb-3">Design Set {index + 1}</p>
                             <div className="space-y-3">
                                 <div>
                                    <label htmlFor={`variation-${ds.id}`} className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">Variation Type (Default/Hover/Active)</label>
                                    <div className="relative"><select id={`variation-${ds.id}`} value={ds.variationType} onChange={e => handleUpdateDesignSet(ds.id, 'variationType', e.target.value)} className="form-select !text-sm !py-2 !bg-[var(--bg-card)]" disabled={isLoading}>{variationTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none"/></div>
                                </div>
                                <div>
                                   <label htmlFor={`instructions-${ds.id}`} className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">Custom Instructions (Optional)</label>
                                    <input type="text" id={`instructions-${ds.id}`} value={ds.customInstructions} onChange={e => handleUpdateDesignSet(ds.id, 'customInstructions', e.target.value)} placeholder="e.g., with a glowing sword" className="form-input !text-sm !py-2 !bg-[var(--bg-card)]" disabled={isLoading}/>
                                </div>
                             </div>
                          </div>
                        ))}
                        {designSets.length < MAX_DESIGN_SETS && <button onClick={addDesignSet} className="button-tertiary w-full !text-sm flex items-center justify-center"><PlusCircle size={16} className="mr-2"/> Add another design set</button>}
                    </div>
                )}
                {generationMode === 'animation' && (
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-[var(--text-primary)]">Animation Sheet Options</h3>
                         <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                             <label htmlFor="frame-count" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Number of Frames</label>
                             <input id="frame-count" type="number" value={frameCount} onChange={e => setFrameCount(Math.max(2, Math.min(12, parseInt(e.target.value, 10) || 2)))} min="2" max="12" className="form-input !bg-[var(--bg-card)]" disabled={isLoading}/>
                             <p className="text-xs text-[var(--text-placeholder)] mt-1.5">Enter a value between 2 and 12. More frames result in smoother animation but take longer to generate.</p>
                         </div>
                     </div>
                )}
                
                {/* Actions */}
                <div className="pt-4 space-y-3">
                    <button onClick={handleGenerate} className="button-primary w-full !py-3.5 !text-lg" disabled={isLoading || !spriteConcept.trim()}>
                        <Sparkles size={22} className="mr-2.5"/> {isLoading ? generationStatus || 'Generating...' : `Generate ${generationMode === 'variants' ? 'Sprite Variants' : 'Animation Sheet'}`}
                    </button>
                    <button onClick={handleClearAll} className="button-secondary w-full" disabled={isLoading}><Trash2 size={20} className="mr-2"/> Clear All</button>
                </div>
            </div>

            {/* --- OUTPUT PANEL --- */}
            <div className="space-y-8">
              {isLoading && <div className="card-style h-full flex flex-col items-center justify-center text-center"><div role="status" className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[var(--accent-gold)] border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" /><p className="mt-4 text-lg text-[var(--accent-gold)]">{generationStatus || 'Generation in progress...'}</p></div>}
              {!isLoading && generatedDesigns.length === 0 && !animationSheetResult && <div className="card-style h-full flex flex-col items-center justify-center text-center"><ImageIcon size={48} className="text-[var(--accent-gold)] opacity-50 mb-4"/><h3 className="h3-style">Your generated sprites will appear here</h3><p className="text-[var(--text-secondary)]">Configure your sprite on the left and click generate.</p></div>}
              
              {generatedDesigns.map((design, index) => (
                <div key={design.id} className="card-style">
                    <h3 className="h3-style mb-4">Result for Design Set {index + 1}</h3>
                    {design.descriptionError && <p className="text-red-500 p-3 bg-red-500/10 rounded-md">Error: {design.descriptionError}</p>}
                    {design.description && (
                        <div className="space-y-4"><DescriptionPreview description={design.description} type="sprite" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-color)]">
                        {(['default', 'hover', 'active'] as const).map(variantKey => {
                            const imageUrl = design.imageUrls[variantKey]; const isSaved = isSpriteSaved(design, variantKey);
                            return (<div key={variantKey} className="p-2 bg-[var(--bg-secondary)] rounded-md"><h4 className="font-semibold capitalize text-center mb-2">{variantKey}</h4><div className="aspect-square bg-[var(--bg-primary)] rounded flex items-center justify-center">
                            {design.isGenerating && !imageUrl && <div role="status" className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-[var(--accent-gold)] border-r-transparent" />}{imageUrl && <img src={imageUrl} alt={`${design.description?.spriteConcept} ${variantKey}`} className="max-w-full max-h-full object-contain"/>}</div>
                            {imageUrl && (<div className="mt-2 space-y-1"><button onClick={() => downloadFile(imageUrl, `sprite_${variantKey}.png`)} className="button-tertiary w-full !text-xs !py-1" disabled={isLoading}><Download size={14} className="mr-1"/> Download</button><button onClick={() => handleSaveSprite(design, variantKey)} className={`button-tertiary w-full !text-xs !py-1 ${isSaved ? '!text-green-500 hover:!bg-green-500/10' : ''}`} disabled={isLoading || isSaved || isStorageFull}><Save size={14} className="mr-1"/>{isSaved ? 'Saved' : 'Save'}</button></div>)}</div>);
                        })}</div>{design.imageError && <p className="text-sm text-red-500 mt-2">Image generation issue: {design.imageError}</p>}</div>)}
                </div>
              ))}

              {animationSheetResult && !isLoading && (
                <div className="card-style">
                    <h3 className="h3-style mb-4">Result for Animation Sheet</h3>
                    {animationSheetResult.descriptionError && <p className="text-red-500 p-3 bg-red-500/10 rounded-md">Error: {animationSheetResult.descriptionError}</p>}
                    {animationSheetResult.description && <DescriptionPreview description={animationSheetResult.description} type="sprite" />}
                    
                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                         <h4 className="font-semibold text-[var(--accent-gold)] mb-2">Generated Sprite Sheet:</h4>
                         {animationSheetResult.stitchedImageUrl ? (
                            <div className="p-2 bg-[var(--bg-secondary)] rounded-md">
                                <div className="bg-checkered-pattern p-2 rounded"><img src={animationSheetResult.stitchedImageUrl} alt="Stitched sprite sheet" className="mx-auto" style={{imageRendering: 'pixelated'}} /></div>
                                <div className="mt-2 space-y-1">
                                    <button onClick={() => downloadFile(animationSheetResult.stitchedImageUrl!, `spritesheet.png`)} className="button-tertiary w-full !text-xs !py-1" disabled={isLoading}><Download size={14} className="mr-1"/> Download Sheet</button>
                                    <button onClick={handleSaveAnimationSheet} className={`button-tertiary w-full !text-xs !py-1 ${isAnimationSheetSaved() ? '!text-green-500 hover:!bg-green-500/10' : ''}`} disabled={isLoading || isAnimationSheetSaved() || isStorageFull}><Save size={14} className="mr-1"/>{isAnimationSheetSaved() ? 'Saved' : 'Save Sheet'}</button>
                                </div>
                            </div>
                         ) : <p className="text-sm text-[var(--text-secondary)]">Sprite sheet could not be created.</p>}
                         
                         {animationSheetResult.imageError && <p className="text-sm text-red-500 mt-2">Image generation issue: {animationSheetResult.imageError}</p>}

                         <h4 className="font-semibold text-[var(--accent-gold)] mt-4 mb-2">Individual Frames ({animationSheetResult.frames.length}):</h4>
                         <div className="grid grid-cols-4 gap-2">
                            {animationSheetResult.frames.map((frameSrc, i) => <div key={i} className="aspect-square bg-[var(--bg-primary)] rounded flex items-center justify-center p-1"><img src={frameSrc} alt={`Frame ${i+1}`} className="max-w-full max-h-full object-contain"/></div>)}
                         </div>
                    </div>
                </div>
              )}
            </div>
        </div>
      </main>
      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={(email) => { setIsLoggedIn(true); setCurrentUserEmail(email); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); setLoginModalOpen(false); }} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={(email) => { setIsLoggedIn(true); setCurrentUserEmail(email); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); setSignupModalOpen(false); }} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
};

// Utility to download a file
function downloadFile(content: string, fileName: string) {
    const a = document.createElement("a");
    a.href = content;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export default Home;