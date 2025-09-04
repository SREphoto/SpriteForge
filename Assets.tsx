

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Page, SavedAsset, SpriteAsset, ItemAsset, MapConceptAsset, StoryConceptAsset, RPGSystemAsset, Project, ConceptArtAsset } from './index'; // Added Project, ConceptArtAsset
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import { Trash2, Download, Info, Tag, Gamepad2, Eye, ServerCrash, Palette, FileText, Box, Map as MapPin, BookOpen, ListChecks, X, Briefcase, Film } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AssetsProps {
  navigateTo: (page: Page) => void;
  appName: string;
  savedAssets: SavedAsset[]; 
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  projects: Project[]; // Added
  activeProjectId: string | null; // Added
}

function downloadFileFromUrl(url: string, fileName: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadTextFile(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const gameGenreOptionsList = [
    { value: 'rpg', label: 'RPG' }, { value: 'fighting', label: 'Fighting' }, { value: 'platformer', label: 'Platformer' },
    { value: 'space-shooter', label: 'Space Shooter' }, { value: 'strategy', label: 'Strategy' }, { value: 'driving-racing', label: 'Driving/Racing' },
    { value: 'war-simulation', label: 'War Sim' }, { value: 'adventure', label: 'Adventure' }, { value: 'puzzle', label: 'Puzzle' },
    { value: 'stealth', label: 'Stealth' }, { value: 'survival', label: 'Survival' }, { value: 'sports', label: 'Sports' },
    { value: 'horror', label: 'Horror'}, {value: 'simulation', label: 'Simulation'}, { value: 'visual-novel', label: 'Visual Novel'},
];
const gamePerspectiveOptionsList = [
    { value: 'side-scrolling', label: 'Side-Scrolling' }, { value: 'top-down', label: 'Top-Down' },
    { value: 'isometric', label: 'Isometric' }, { value: 'front-facing', label: 'Front-Facing' },
];
const itemCategoryLabels: Record<string, string> = {
    weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory', consumable: 'Consumable', misc_loot: 'Misc. Loot'
};


const gameGenreLabel = (value: string) => gameGenreOptionsList.find(g => g.value === value)?.label || value;
const gamePerspectiveLabel = (value: string) => gamePerspectiveOptionsList.find(p => p.value === value)?.label || value;

const ContentDisplayModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="content-modal-title">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div className="card-style relative max-w-2xl w-full z-10 !p-6 sm:!p-8 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <h3 id="content-modal-title" className="font-display text-xl text-[var(--accent-gold)]">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                <X size={20}/>
            </button>
        </div>
        <div className="flex-grow overflow-y-auto bg-[var(--bg-secondary)] p-3 rounded-md border border-[var(--border-color)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
             h1: ({node, ...props}) => <h1 className="font-display text-xl font-bold my-2 text-[var(--accent-gold)] border-b border-[var(--border-color)] pb-1" {...props} />,
             h2: ({node, ...props}) => <h2 className="font-display text-lg font-semibold my-2 text-[var(--accent-gold)]" {...props} />,
             h3: ({node, ...props}) => <h3 className="font-display text-base font-semibold mt-3 mb-1 text-[var(--text-primary)]" {...props} />,
             p: ({node, ...props}) => <p className="mb-2 text-sm text-[var(--text-secondary)] leading-relaxed" {...props} />,
             ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-0.5 text-sm text-[var(--text-secondary)]" {...props} />,
             strong: ({node, ...props}) => <strong className="font-semibold text-[var(--text-primary)]" {...props} />,
          }}>
            {content}
          </ReactMarkdown>
        </div>
        <button type="button" onClick={onClose} className="button-secondary mt-5 !px-6 !py-2.5 self-end">Close</button>
      </div>
    </div>
  );
};


export default function Assets({ navigateTo, appName, savedAssets, setSavedAssets, projects, activeProjectId }: AssetsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);
  const [promptModalContent, setPromptModalContent] = useState<string | null>(null);
  const [textContentModal, setTextContentModal] = useState<{ title: string, content: string } | null>(null);

   useEffect(() => {
    const storedUser = localStorage.getItem('spriteForgeUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setIsLoggedIn(true);
      setCurrentUserEmail(user.email);
    }
  }, []);

  const handleLogin = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setLoginModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email }));};
  const handleSignup = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); setSignupModalOpen(false); localStorage.setItem('spriteForgeUser', JSON.stringify({ email }));};
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); };

  const handleRemoveAsset = (assetId: string) => {
    setSavedAssets(prev => prev.filter(asset => asset.id !== assetId));
    // Also remove from project.linkedAssetIds if implemented
  };
  
  const handleDownloadImage = (asset: SpriteAsset | ItemAsset | ConceptArtAsset) => {
    const fileName = `${asset.name.replace(/\s+/g, '_').substring(0,30)}_${asset.assetType}_${asset.id.substring(0,5)}.png`;
    try {
        downloadFileFromUrl(asset.imageUrl, fileName);
    } catch (e: any) {
        setErrorDetails({title: "Download Error", message: `Could not download image: ${e.message}`});
    }
  };

  const handleDownloadText = (asset: MapConceptAsset | StoryConceptAsset | RPGSystemAsset) => {
    let fileName = `${asset.name.replace(/\s+/g, '_').substring(0,30)}_${asset.assetType}.md`;
    if (asset.assetType === 'rpgSystemData') fileName = `${asset.name.replace(/\s+/g, '_').substring(0,30)}_${(asset as RPGSystemAsset).systemSection}.md`;
    downloadTextFile(asset.content, fileName, 'text/markdown;charset=utf-8');
  };
  
  const getProjectName = (projectId?: string): string | null => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.name || null;
  };

  const sortedAssets = [...savedAssets].sort((a, b) => b.timestamp - a.timestamp);

  const renderAssetCard = (asset: SavedAsset) => {
    const projectName = getProjectName(asset.projectId);
    switch (asset.assetType) {
      case 'sprite':
      case 'item':
      case 'conceptArt':
        const imgAsset = asset as SpriteAsset | ItemAsset | ConceptArtAsset;
        return (
          <div key={asset.id} className="card-style flex flex-col group">
            <div className="relative mb-3 aspect-[4/3] bg-[var(--bg-secondary)] rounded-md overflow-hidden border border-[var(--border-color)]">
                <img src={imgAsset.imageUrl} alt={asset.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"/>
            </div>
            <div className="flex-grow space-y-2 mb-3">
                <p className="text-sm text-[var(--text-primary)] font-semibold line-clamp-2" title={asset.name}>
                   {asset.assetType === 'sprite' && <Palette size={14} className="inline mr-1.5 text-[var(--accent-gold)] opacity-80" />}
                   {asset.assetType === 'item' && <Box size={14} className="inline mr-1.5 text-[var(--accent-gold)] opacity-80" />}
                   {asset.assetType === 'conceptArt' && <FileText size={14} className="inline mr-1.5 text-[var(--accent-gold)] opacity-80" />}
                   {asset.name}
                </p>
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                    {asset.assetType === 'sprite' && <>
                        {asset.isAnimationSheet ? 
                         <p><Film size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>{asset.frameCount}-Frame Animation</strong></p>
                         : <p><Tag size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Variant:</strong> <span className="capitalize">{asset.variantKey}</span></p>
                        }
                        <p><Gamepad2 size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Genre:</strong> {gameGenreLabel(asset.gameGenre)}</p>
                        <p><Eye size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Perspective:</strong> {gamePerspectiveLabel(asset.gamePerspective)}</p>
                    </>}
                     {asset.assetType === 'item' && <>
                        <p><Box size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Category:</strong> {itemCategoryLabels[asset.itemCategory] || asset.itemCategory}</p>
                        <p><Eye size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Perspective:</strong> {gamePerspectiveLabel(asset.gamePerspective)}</p>
                         <p><Tag size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Variant:</strong> <span className="capitalize">{asset.variantKey}</span></p>
                    </>}
                    {asset.assetType === 'conceptArt' && <>
                         <p className="capitalize"><Tag size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Source:</strong> {asset.sourceAssetType.replace('Concept', '').replace('Data','')}</p>
                    </>}
                    {projectName && <p><Briefcase size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Project:</strong> {projectName}</p>}
                </div>
            </div>
            <div className="mt-auto pt-3 border-t border-[var(--border-color)] space-y-2">
               <button type="button" onClick={() => setPromptModalContent(imgAsset.prompt)} className="button-tertiary w-full !text-xs !justify-start !px-3 !py-1.5">
                    <Info size={14} className="mr-2" /> View AI Prompt
                </button>
                <div className="flex gap-2">
                    <button type="button" onClick={() => handleDownloadImage(imgAsset)} className="button-secondary flex-1 !text-xs !px-3 !py-1.5">
                        <Download size={14} className="mr-1.5" /> Download Image
                    </button>
                    <button type="button" onClick={() => handleRemoveAsset(asset.id)} className="button-tertiary flex-1 !text-xs !text-red-500 hover:!bg-red-500/10 !px-3 !py-1.5">
                        <Trash2 size={14} className="mr-1.5" /> Remove
                    </button>
                </div>
            </div>
          </div>
        );
      case 'mapConcept':
      case 'storyConcept':
      case 'rpgSystemData':
        const textAsset = asset as MapConceptAsset | StoryConceptAsset | RPGSystemAsset;
        let Icon = FileText;
        if (asset.assetType === 'mapConcept') Icon = MapPin;
        if (asset.assetType === 'storyConcept') Icon = BookOpen;
        if (asset.assetType === 'rpgSystemData') Icon = ListChecks;
        
        let subDetail = `Type: ${asset.assetType.replace('Concept', '').replace('Data', '')}`;
        if (asset.assetType === 'mapConcept') subDetail = `Perspective: ${gamePerspectiveLabel((asset as MapConceptAsset).perspective)}`;
        if (asset.assetType === 'storyConcept') subDetail = `Genre: ${gameGenreLabel((asset as StoryConceptAsset).genre)}`;
        if (asset.assetType === 'rpgSystemData') subDetail = `Section: ${(asset as RPGSystemAsset).systemSection.replace(/_/g, ' ')}`;


        return (
          <div key={asset.id} className="card-style flex flex-col group">
            <div className="flex-grow space-y-2 mb-3">
                <p className="text-sm text-[var(--text-primary)] font-semibold line-clamp-2 flex items-center" title={asset.name}>
                   <Icon size={16} className="inline mr-2 text-[var(--accent-gold)] opacity-80 flex-shrink-0" /> {asset.name}
                </p>
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                    <p className="capitalize">{subDetail}</p>
                    {projectName && <p><Briefcase size={13} className="inline mr-1.5 text-[var(--accent-gold)] opacity-70" /> <strong>Project:</strong> {projectName}</p>}
                    <p>Saved: {new Date(asset.timestamp).toLocaleDateString()}</p>
                </div>
            </div>
            <div className="mt-auto pt-3 border-t border-[var(--border-color)] space-y-2">
                <button type="button" onClick={() => setTextContentModal({title: asset.name, content: textAsset.content})} className="button-secondary w-full !text-xs !justify-start !px-3 !py-1.5">
                    <Eye size={14} className="mr-2" /> View Content
                </button>
                <div className="flex gap-2">
                    <button type="button" onClick={() => handleDownloadText(textAsset)} className="button-tertiary flex-1 !text-xs !px-3 !py-1.5">
                        <Download size={14} className="mr-1.5" /> Download Text
                    </button>
                    <button type="button" onClick={() => handleRemoveAsset(asset.id)} className="button-tertiary flex-1 !text-xs !text-red-500 hover:!bg-red-500/10 !px-3 !py-1.5">
                        <Trash2 size={14} className="mr-1.5" /> Remove
                    </button>
                </div>
            </div>
          </div>
        );
      default:
        return null; 
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />

      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="h1-style text-center sm:text-left mb-4 sm:mb-0 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">
            My Saved Assets
          </h1>
          <button type="button" onClick={() => navigateTo('roadmap-designer')} className="button-secondary !px-5 !py-2.5 flex items-center">
            <Briefcase size={20} className="mr-2" /> Back to Roadmap
          </button>
        </div>

        {sortedAssets.length === 0 ? (
          <div className="text-center py-16 card-style">
            <ServerCrash size={64} className="mx-auto text-[var(--accent-gold)] mb-6" />
            <h2 className="h2-style mb-3">No Assets Saved Yet</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Your asset library is empty. Use the generator tools to create sprites, items, map concepts, and more, then save them here!
            </p>
            <button type="button" onClick={() => navigateTo('roadmap-designer')} className="button-primary !px-8 !py-3 text-lg">
              Go to Roadmap Designer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedAssets.map(renderAssetCard)}
          </div>
        )}
      </main>

      <footer className="w-full text-center p-6 border-t border-[var(--border-color)] mt-12">
        <p className="text-sm text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} {appName}. My Saved Assets.</p>
      </footer>
      
      {promptModalContent && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
            <div className="absolute inset-0 modal-backdrop" onClick={() => setPromptModalContent(null)} />
            <div className="card-style relative max-w-xl w-full z-10 !p-6 sm:!p-8 max-h-[70vh] flex flex-col">
                <h3 id="prompt-modal-title" className="font-display text-xl text-[var(--accent-gold)] mb-3">AI Generation Prompt</h3>
                <div className="flex-grow overflow-y-auto bg-[var(--bg-secondary)] p-3 rounded-md border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{promptModalContent}</p>
                </div>
                <button type="button" onClick={() => setPromptModalContent(null)} className="button-secondary mt-5 !px-6 !py-2.5 self-end">Close</button>
            </div>
        </div>
      )}
      <ContentDisplayModal isOpen={!!textContentModal} onClose={() => setTextContentModal(null)} title={textContentModal?.title} content={textContentModal?.content} />
      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}