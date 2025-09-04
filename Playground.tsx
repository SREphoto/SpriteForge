
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Page, SavedAsset, SpriteAsset, MapConceptAsset } from './index'; // Updated imports
import { GoogleGenAI } from '@google/genai';
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import { Palette, BoxSelect, ChevronDown, LayoutGrid, X, ArrowUp, ArrowDown, Image as ImageIcon, PlusCircle } from 'lucide-react';

const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


interface PlaygroundProps {
  navigateTo: (page: Page) => void;
  appName: string;
  savedAssets: SavedAsset[];
}

interface PlacedAsset {
    instanceId: string;
    asset: SpriteAsset;
    x: number;
    y: number;
    zIndex: number;
}

export default function Playground({ navigateTo, appName, savedAssets }: PlaygroundProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);
  
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetInstanceId, setSelectedAssetInstanceId] = useState<string | null>(null);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isBgLoading, setIsBgLoading] = useState(false);
  
  const playgroundRef = useRef<HTMLDivElement>(null);
  const draggingAssetRef = useRef<{ instanceId: string, offsetX: number, offsetY: number } | null>(null);
  
  const availableSprites = savedAssets.filter(asset => asset.assetType === 'sprite') as SpriteAsset[];
  const availableMapConcepts = savedAssets.filter(asset => asset.assetType === 'mapConcept') as MapConceptAsset[];

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

  const addSpriteToPlayground = (sprite: SpriteAsset) => {
    const maxZIndex = placedAssets.reduce((max, asset) => Math.max(max, asset.zIndex), 0);
    const newAsset: PlacedAsset = {
        instanceId: `${sprite.id}-${Date.now()}`,
        asset: sprite,
        x: 50,
        y: 50,
        zIndex: maxZIndex + 1
    };
    setPlacedAssets(prev => [...prev, newAsset]);
    setShowAssetSelector(false);
  };
  
  const removeSpriteFromPlayground = (instanceId: string) => {
    setPlacedAssets(prev => prev.filter(a => a.instanceId !== instanceId));
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, instanceId: string) => {
    setSelectedAssetInstanceId(instanceId);
    const playgroundBounds = playgroundRef.current?.getBoundingClientRect();
    const assetElem = e.currentTarget;
    const assetBounds = assetElem.getBoundingClientRect();
    
    if (playgroundBounds) {
        draggingAssetRef.current = {
            instanceId,
            offsetX: e.clientX - assetBounds.left,
            offsetY: e.clientY - assetBounds.top
        };
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!draggingAssetRef.current) return;
            const newX = moveEvent.clientX - playgroundBounds.left - draggingAssetRef.current.offsetX;
            const newY = moveEvent.clientY - playgroundBounds.top - draggingAssetRef.current.offsetY;

            setPlacedAssets(prev => prev.map(p => 
                p.instanceId === instanceId ? { ...p, x: newX, y: newY } : p
            ));
        };
        
        const handleMouseUp = () => {
            draggingAssetRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
  };
  
  const changeZIndex = (direction: 'up' | 'down') => {
    if (!selectedAssetInstanceId) return;
    setPlacedAssets(prev => {
        const assets = [...prev].sort((a, b) => a.zIndex - b.zIndex);
        const currentIndex = assets.findIndex(a => a.instanceId === selectedAssetInstanceId);
        if (currentIndex === -1) return prev;

        if (direction === 'up' && currentIndex < assets.length - 1) {
            [assets[currentIndex].zIndex, assets[currentIndex + 1].zIndex] = [assets[currentIndex + 1].zIndex, assets[currentIndex].zIndex];
        } else if (direction === 'down' && currentIndex > 0) {
            [assets[currentIndex].zIndex, assets[currentIndex - 1].zIndex] = [assets[currentIndex - 1].zIndex, assets[currentIndex].zIndex];
        }
        return assets;
    });
  };

  const generateAndSetBackground = async (mapConcept: MapConceptAsset) => {
    setShowBgSelector(false);
    setIsBgLoading(true);
    try {
        const prompt = `A beautiful, atmospheric, high-quality digital painting of a game background based on this concept: "${mapConcept.name}". The perspective should be ${mapConcept.perspective}. The overall mood should be consistent with the following description: ${mapConcept.content.substring(0, 500)}`;
        const response = await ai.models.generateImages({
            model: IMAGE_MODEL_NAME,
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
            setBackgroundUrl(`data:image/png;base64,${response.generatedImages[0].image.imageBytes}`);
        } else {
            throw new Error('No background image generated.');
        }
    } catch (e: any) {
        setErrorDetails({ title: "Background Generation Failed", message: e.message });
    } finally {
        setIsBgLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="h1-style text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">Interactive Scene Builder</h1>
        <div className="card-style mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setShowAssetSelector(true)} className="button-primary flex-1"><PlusCircle size={18} className="mr-2"/>Add Sprite</button>
                    <button type="button" onClick={() => setShowBgSelector(true)} className="button-secondary flex-1"><ImageIcon size={18} className="mr-2"/>Set Background</button>
                </div>
                 <div className="flex gap-2 items-center justify-center md:justify-end">
                    <button onClick={() => changeZIndex('down')} className="button-tertiary !px-3" disabled={!selectedAssetInstanceId} title="Send Backward"><ArrowDown size={20}/></button>
                    <span className="text-xs text-[var(--text-placeholder)]">Layering</span>
                    <button onClick={() => changeZIndex('up')} className="button-tertiary !px-3" disabled={!selectedAssetInstanceId} title="Bring Forward"><ArrowUp size={20}/></button>
                </div>
            </div>
        </div>
        
        <div ref={playgroundRef} className="w-full aspect-[16/9] card-style !p-0 overflow-hidden relative bg-[var(--bg-secondary)] bg-checkered-pattern"
            onClick={(e) => { if(e.target === playgroundRef.current) setSelectedAssetInstanceId(null); }}>
            {isBgLoading && <div className="absolute inset-0 z-0 bg-black/50 flex items-center justify-center"><div role="status" className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"/></div>}
            {backgroundUrl && <img src={backgroundUrl} alt="Generated background" className="absolute inset-0 w-full h-full object-cover z-0" />}
            
            {placedAssets.map(pa => (
                <div key={pa.instanceId} 
                    onMouseDown={(e) => handleMouseDown(e, pa.instanceId)}
                    className={`absolute cursor-grab group ${selectedAssetInstanceId === pa.instanceId ? 'ring-2 ring-[var(--accent-gold)]' : ''}`}
                    style={{ left: pa.x, top: pa.y, zIndex: pa.zIndex, touchAction: 'none' }}>
                    <img src={pa.asset.imageUrl} alt={pa.asset.name} draggable="false" className="max-w-[128px] max-h-[128px] object-contain pointer-events-none" />
                    <button onClick={() => removeSpriteFromPlayground(pa.instanceId)} className="absolute -top-2 -right-2 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                </div>
            ))}
            {placedAssets.length === 0 && !isBgLoading && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--text-placeholder)] text-center">Your scene canvas is empty.<br/>Add sprites or set a background to begin.</p>}
        </div>
        {placedAssets.length > 0 && <div className="mt-4 text-center"><button onClick={() => setPlacedAssets([])} className="button-tertiary !text-red-500">Clear All Sprites</button></div>}
      </main>

      {showAssetSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowAssetSelector(false)}></div>
          <div className="card-style relative max-w-3xl w-full z-10 !p-6 sm:!p-8 max-h-[80vh] flex flex-col">
            <h3 className="font-display text-xl text-[var(--accent-gold)] mb-4">Select Sprite to Add</h3>
            {availableSprites.length === 0 ? (<p className="text-[var(--text-secondary)] text-center py-8">You have no saved sprites. <button onClick={() => {setShowAssetSelector(false); navigateTo('home');}} className="text-[var(--accent-gold)] hover:underline">Generate some first!</button></p>) : 
            (<div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-2">
            {availableSprites.map(sprite => (
                <button key={sprite.id} onClick={() => addSpriteToPlayground(sprite)} className="p-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] hover:border-[var(--accent-gold)] focus:border-[var(--accent-gold)] focus:ring-1 ring-[var(--accent-gold)] transition-all group" title={`Add ${sprite.name}`}>
                <img src={sprite.imageUrl} alt={sprite.name} className="w-full h-24 object-contain rounded mb-1 group-hover:scale-105 transition-transform" />
                <p className="text-xs text-[var(--text-placeholder)] truncate">{sprite.name}</p>
                </button>
            ))}</div>)}
            <button type="button" onClick={() => setShowAssetSelector(false)} className="button-secondary mt-5 !px-6 !py-2.5 self-end">Close</button>
          </div>
        </div>
      )}
      {showBgSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowBgSelector(false)}></div>
          <div className="card-style relative max-w-3xl w-full z-10 !p-6 sm:!p-8 max-h-[80vh] flex flex-col">
            <h3 className="font-display text-xl text-[var(--accent-gold)] mb-4">Select Map Concept for Background</h3>
            {availableMapConcepts.length === 0 ? (<p className="text-[var(--text-secondary)] text-center py-8">You have no saved map concepts. <button onClick={() => {setShowBgSelector(false); navigateTo('map-generator');}} className="text-[var(--accent-gold)] hover:underline">Generate one first!</button></p>) : 
            (<div className="flex-grow overflow-y-auto space-y-2 pr-2">
            {availableMapConcepts.map(mc => (
                <button key={mc.id} onClick={() => generateAndSetBackground(mc)} className="w-full text-left p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] hover:border-[var(--accent-gold)] transition-colors">
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{mc.name}</p>
                    <p className="text-xs text-[var(--text-placeholder)] capitalize">Perspective: {mc.perspective}</p>
                </button>
            ))}</div>)}
            <button type="button" onClick={() => setShowBgSelector(false)} className="button-secondary mt-5 !px-6 !py-2.5 self-end">Close</button>
          </div>
        </div>
      )}
      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}