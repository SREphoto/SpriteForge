

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import '@tailwindcss/browser';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Home from './Home';
import Playground from './Playground';
import Assets from './Assets';
import MapGenerator from './MapGenerator';
import StoryGenerator from './StoryGenerator';
import ItemGenerator from './ItemGenerator';
import RPGSystemGenerator from './RPGSystemGenerator';
import RoadmapDesigner from './RoadmapDesigner';
import Projects from './Projects'; // New Projects page
import ErrorModal from './components/ErrorModal'; // Import ErrorModal
import { AlertTriangle, Sparkles } from 'lucide-react';

const LOCAL_STORAGE_ASSETS_KEY = 'spriteForgeUnifiedAssets';
const LOCAL_STORAGE_PROJECTS_KEY = 'spriteForgeProjects'; // New key for projects
const APP_NAME = "SpriteForge";

export type AssetType = 'sprite' | 'item' | 'mapConcept' | 'storyConcept' | 'rpgSystemData' | 'conceptArt';

export interface BaseAsset {
  id: string;
  timestamp: number;
  name: string;
  assetType: AssetType;
  projectId?: string; // Optional: Link asset to a project
}

export interface SpriteAsset extends BaseAsset {
  assetType: 'sprite';
  imageUrl: string;
  // For static variants
  variantKey?: 'default' | 'hover' | 'active';
  // For animation sheets
  isAnimationSheet?: boolean;
  animationType?: string;
  frameCount?: number;
  spriteConcept: string;
  prompt: string;
  gameGenre: string;
  gamePerspective: string;
  rpgCharacterType?: string;
  animationState?: string;
}

export interface ItemAsset extends BaseAsset {
  assetType: 'item';
  imageUrl: string;
  variantKey: 'default' | 'hover' | 'active';
  itemConcept: string;
  prompt: string;
  itemCategory: string;
  itemType: string;
  gamePerspective: string;
}

export interface MapConceptAsset extends BaseAsset {
  assetType: 'mapConcept';
  mapTheme: string;
  perspective: string;
  content: string;
}

export interface StoryConceptAsset extends BaseAsset {
  assetType: 'storyConcept';
  storyTheme: string;
  genre: string;
  content: string;
}

export interface RPGSystemAsset extends BaseAsset {
  assetType: 'rpgSystemData';
  systemSection: string;
  configDetails: any;
  content: string;
}

export interface ConceptArtAsset extends BaseAsset {
    assetType: 'conceptArt';
    imageUrl: string;
    prompt: string;
    sourceAssetId: string; // ID of the text asset it was generated from
    sourceAssetType: 'mapConcept' | 'storyConcept' | 'rpgSystemData';
}

export type SavedAsset = SpriteAsset | ItemAsset | MapConceptAsset | StoryConceptAsset | RPGSystemAsset | ConceptArtAsset;

export interface Project {
  id: string;
  name: string;
  timestamp: number;
  storyConceptId: string | null; // ID of the primary StoryConceptAsset
  gameGenre?: string; // Derived from story or set at project creation
  gamePerspective?: string; // Derived from story or set at project creation
  linkedAssetIds: {
    sprites: string[];
    items: string[];
    mapConcepts: string[];
    rpgSystems: string[];
    conceptArt?: string[]; // Added for concept art
  };
}

export type Page = 'home' | 'playground' | 'assets' | 'map-generator' | 'story-generator' | 'item-generator' | 'rpg-system-generator' | 'roadmap-designer' | 'projects';

export interface PrefillState {
  targetPage: Page | null;
  data: string | null;
  field: string | null; // e.g., 'spriteConcept', 'itemTheme', 'mapTheme'
}

interface BatchStatus {
    isActive: boolean;
    message: string;
    total: number;
    current: number;
}

const isQuotaExceededError = (e: any): boolean => {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
};

const BatchStatusIndicator: React.FC<{ status: BatchStatus }> = ({ status }) => {
    if (!status.isActive) return null;

    const progress = status.total > 0 ? (status.current / status.total) * 100 : 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[var(--accent-gold)] text-[var(--accent-gold-text-on-gold)] p-3 text-center text-sm shadow-lg flex items-center justify-center animate-fade-in-down">
            <Sparkles size={18} className="mr-2 animate-pulse" />
            <div className="flex-grow text-left">
                <p className="font-semibold">{status.message} ({status.current}/{status.total})</p>
                <div className="w-full bg-[var(--accent-gold-text-on-gold)]/30 rounded-full h-1.5 mt-1">
                    <div className="bg-[var(--accent-gold-text-on-gold)] h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};


const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('roadmap-designer'); // Default to roadmap
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState<{isCreating: boolean, newProjectName: string | null}>({isCreating: false, newProjectName: null });
  const [globalErrorDetails, setGlobalErrorDetails] = useState<{ title: string, message: string } | null>(null);
  const [isStorageFull, setIsStorageFull] = useState<boolean>(false);
  const [prefillState, setPrefillState] = useState<PrefillState>({ targetPage: null, data: null, field: null });
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({ isActive: false, message: '', total: 0, current: 0 });


  // Load saved assets from localStorage
  useEffect(() => {
    const storedAssets = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
    if (storedAssets) {
      try {
        setSavedAssets(JSON.parse(storedAssets));
      } catch (e:any) {
        console.error("Failed to parse saved assets from localStorage:", e);
        setGlobalErrorDetails({ title: "Load Error", message: `Could not load saved assets. Your saved data might be corrupted. Error: ${e.message}` });
      }
    }
  }, []);

  // Update assets in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(savedAssets));
      if (isStorageFull) { // If save succeeded and storage was marked as full, reset the flag.
        setIsStorageFull(false);
      }
    } catch (e: any) {
      if (isQuotaExceededError(e)) {
        if (!isStorageFull) { // Only show modal and set flag if not already set (prevents repeated modals for same state)
            setGlobalErrorDetails({
            title: "Storage Full",
            message: "Browser local storage is full. Cannot save new asset changes. Please delete some assets from 'My Assets' or clear browser storage for this site to continue saving."
            });
            setIsStorageFull(true);
        }
      } else {
        setGlobalErrorDetails({ title: "Save Error", message: `Could not save assets: ${e.message}` });
      }
      console.error("Error saving assets to localStorage: ", e);
    }
  }, [savedAssets, isStorageFull]); // Added isStorageFull to dependency array

  // Load projects from localStorage
  useEffect(() => {
    const storedProjects = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (storedProjects) {
      try {
        setProjects(JSON.parse(storedProjects));
      } catch (e:any) {
        console.error("Failed to parse projects from localStorage:", e);
        setGlobalErrorDetails({ title: "Load Error", message: `Could not load projects. Your saved data might be corrupted. Error: ${e.message}` });
      }
    }
  }, []);

  // Update projects in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
       if (isStorageFull) { // If save succeeded and storage was marked as full, reset the flag.
        setIsStorageFull(false);
      }
    } catch (e: any) { // Corrected: Moved if condition inside the catch block
      if (isQuotaExceededError(e)) {
        if (!isStorageFull) {
            setGlobalErrorDetails({
            title: "Storage Full",
            message: "Browser local storage is full. Cannot save project changes. Please delete some assets from 'My Assets' or clear browser storage for this site to continue saving."
            });
            setIsStorageFull(true);
        }
      } else {
        setGlobalErrorDetails({ title: "Save Error", message: `Could not save projects: ${e.message}` });
      }
      console.error("Error saving projects to localStorage: ", e);
    }
  }, [projects, isStorageFull]); // Added isStorageFull to dependency array
  
  // Auto-activate the first project if one exists and no project is active
  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
        // setActiveProjectId(projects[0].id); // Optionally auto-activate
    }
  }, [projects, activeProjectId]);


  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const navigateToWithPrefill = (page: Page, data: string, field: string) => {
    setPrefillState({ targetPage: page, data, field });
    navigateTo(page);
  };

  const clearPrefillState = () => {
    setPrefillState({ targetPage: null, data: null, field: null });
  };

  const commonProps = {
    navigateTo,
    navigateToWithPrefill, // New
    appName: APP_NAME,
    savedAssets,
    setSavedAssets,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    isCreatingProject,
    setIsCreatingProject,
    isStorageFull,
    prefillState, // New
    clearPrefillState, // New
    setBatchStatus, // New for batch generation
  };

  let pageComponent;
  switch (currentPage) {
    case 'projects': pageComponent = <Projects {...commonProps} />; break;
    case 'assets': pageComponent = <Assets {...commonProps} />; break;
    case 'playground': pageComponent = <Playground {...commonProps} />; break;
    case 'map-generator': pageComponent = <MapGenerator {...commonProps} />; break;
    case 'story-generator': pageComponent = <StoryGenerator {...commonProps} />; break;
    case 'item-generator': pageComponent = <ItemGenerator {...commonProps} />; break;
    case 'rpg-system-generator': pageComponent = <RPGSystemGenerator {...commonProps} />; break;
    case 'roadmap-designer': pageComponent = <RoadmapDesigner {...commonProps} />; break;
    default: pageComponent = <Home {...commonProps} />;
  }

  return (
    <>
      {isStorageFull && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white p-3 text-center text-sm shadow-lg flex items-center justify-center">
          <AlertTriangle size={18} className="mr-2" />
          Browser storage is full. Saving new data is disabled. Please go to "My Assets" and delete items to free up space.
        </div>
      )}
      <div className={isStorageFull ? 'pt-10' : ''}> {/* Add padding if banner is shown */}
        {pageComponent}
      </div>
      <BatchStatusIndicator status={batchStatus} />
      <ErrorModal 
        isOpen={!!globalErrorDetails} 
        onClose={() => setGlobalErrorDetails(null)} 
        title={globalErrorDetails?.title || "Error"} 
        message={globalErrorDetails?.message || "An unexpected error occurred."} 
      />
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);