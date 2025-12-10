
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Page, SavedAsset, ItemAsset, Project, PrefillState } from './index'; // Added Project, PrefillState
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import DescriptionPreview from './public/DescriptionPreview'; 
import { Palette, Sparkles, Settings2, Download, Save, Trash2, ChevronDown, Info, LayoutGrid, BoxSelect, Sword, Shield as ShieldIcon, Gem, Scroll, WandSparkles, Redo } from 'lucide-react';
import { gamePerspectiveOptions } from './Home'; 

const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ItemGeneratorProps {
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

interface ItemDescriptionJson {
  itemConcept: string; 
  styleAnalysis: { notes: string };
  variants: {
    default: { prompt: string };
    hover: { prompt: string }; 
    active: { prompt: string }; 
  };
  itemCategory?: string;
  itemType?: string;
}

interface ItemImageUrls {
  default: string | null;
  hover: string | null;
  active: string | null;
}

const itemCategories = [
    { value: 'weapon', label: 'Weapon' },
    { value: 'armor', label: 'Armor' },
    { value: 'accessory', label: 'Accessory (Jewelry)' },
    { value: 'consumable', label: 'Consumable (Potion/Scroll)' },
    { value: 'misc_loot', label: 'Miscellaneous Loot' },
];

const itemTypesByCategory: Record<string, { value: string, label: string }[]> = {
    weapon: [
        { value: 'sword_1h', label: 'Sword (One-Handed)'}, { value: 'sword_2h', label: 'Sword (Two-Handed)'},
        { value: 'axe_1h', label: 'Axe (One-Handed)'}, { value: 'axe_2h', label: 'Axe (Two-Handed)'},
        { value: 'mace_1h', label: 'Mace (One-Handed)'}, { value: 'mace_2h', label: 'Mace (Two-Handed)'},
        { value: 'dagger', label: 'Dagger'}, { value: 'staff', label: 'Staff (Magic)'},
        { value: 'wand', label: 'Wand'}, { value: 'bow', label: 'Bow'}, { value: 'crossbow', label: 'Crossbow'},
        { value: 'polearm', label: 'Polearm/Spear'}, { value: 'fist_weapon', label: 'Fist Weapon'},
    ],
    armor: [
        { value: 'helmet', label: 'Helmet/Headgear'}, { value: 'chest_armor', label: 'Chest Armor/Robes'},
        { value: 'gloves', label: 'Gloves/Gauntlets'}, { value: 'boots', label: 'Boots/Greaves'},
        { value: 'shield', label: 'Shield'}, { value: 'belt', label: 'Belt'},
        { value: 'pauldrons', label: 'Pauldrons (Shoulders)'}, { value: 'bracers', label: 'Bracers (Wrists)'},
    ],
    accessory: [
        { value: 'ring', label: 'Ring'}, { value: 'amulet', label: 'Amulet/Necklace'},
        { value: 'trinket', label: 'Trinket/Relic'}, { value: 'cloak', label: 'Cloak/Cape'},
    ],
    consumable: [
        { value: 'health_potion', label: 'Health Potion'}, { value: 'mana_potion', label: 'Mana/Resource Potion'},
        { value: 'buff_potion', label: 'Buff Potion (e.g. Strength)'}, { value: 'scroll_spell', label: 'Scroll (Spell)'},
        { value: 'scroll_utility', label: 'Scroll (Utility, e.g. Town Portal)'}, { value: 'food', label: 'Food/Drink'},
    ],
    misc_loot: [
        { value: 'gold_coins', label: 'Gold Coins/Currency Pile'}, { value: 'gemstone', label: 'Gemstone'},
        { value: 'crafting_material', label: 'Crafting Material (e.g. Ore, Herb)'}, { value: 'quest_item', label: 'Generic Quest Item (e.g. Key, Orb)'},
        { value: 'book_tome', label: 'Book/Tome'},
    ]
};

const itemVariationTypeOptions = [ 
  { value: 'highlight', label: 'Highlight / Subtle Glow' },
  { value: 'imbued', label: 'Magically Imbued / Elemental Effect' },
  { value: 'damaged', label: 'Slightly Damaged / Worn' },
  { value: 'ornate_detail', label: 'Enhanced Ornate Detail' },
];

const itemVariationInstructionsMap: Record<string, string> = {
  highlight: "For 'hover', describe a subtle highlight or sheen. For 'active', describe a soft glow or brighter highlight, as if selected.",
  imbued: "For 'hover', describe faint magical particles or a hint of elemental energy. For 'active', describe a more pronounced magical aura, elemental effect (fire, ice, etc.), or glowing runes.",
  damaged: "For 'hover', describe minor scuffs or wear. For 'active', describe small cracks, dents, or slightly frayed edges, indicating use or age.",
  ornate_detail: "For 'hover', describe a key ornate detail becoming slightly more prominent. For 'active', describe intricate details like engravings or filigree appearing sharper or more visually emphasized.",
};

const defaultItemSystemPrompt = `
You are an expert 2D game asset designer specializing in items and equipment, particularly for RPGs with an isometric or top-down perspective.
Your goal is to generate detailed text prompts for creating new item sprites based on user specifications.
The generated items will have three variants: 'default', 'hover' (e.g., for UI selection), and 'active' (e.g., for a special state or enhanced version).

OUTPUT FORMAT:
You MUST strictly output a JSON object with the following structure:
{
  "itemConcept": "A concise description of the item, incorporating its type, material, and style.",
  "styleAnalysis": {
    "notes": "Brief notes on how to render this item, considering its material, style keywords, and chosen perspective. Focus on visual characteristics."
  },
  "variants": {
    "default": {
      "prompt": "A detailed, descriptive prompt for the 'default' state of the item. Describe its appearance, shape, materials, colors, and key visual details, consistent with the chosen perspective."
    },
    "hover": {
      "prompt": "A detailed, descriptive prompt for the 'hover' state. This should be a distinct variation from the default, suitable for a hover-over effect. Apply the specific item variation type instruction provided by the user."
    },
    "active": {
      "prompt": "A detailed, descriptive prompt for the 'active' state. This should be a distinct variation from both default and hover, suitable for an enhanced state or special effect. Apply the specific item variation type instruction."
    }
  },
  "itemCategory": "User-selected item category",
  "itemType": "User-selected item type"
}

ITEM CONTEXT:
- Item Category: (e.g., Weapon, Armor)
- Item Type: (e.g., Sword, Helmet)
- Material/Primary Color: (e.g., Iron, Gold, Demonic Red)
- Style Keywords: (e.g., Ornate, Ancient, Glowing)
- Perspective: (e.g., Isometric, Top-Down) - CRITICAL for how the item is depicted. For Isometric, ensure the item is angled correctly. For Top-Down, show its top profile.
// Active Project Story Context will be injected here if a project is active.

VARIATION TYPE INSTRUCTIONS:
The user will provide an 'Item Variation Type'. Use its instructions to differentiate 'hover' and 'active' states.

GENERAL GUIDELINES:
- Prompts must be suitable for an AI image generation model.
- Ensure visual consistency in the core design of the item across variants, unless the variation type implies a change.
- Be specific for the chosen perspective. For example, an isometric sword should clearly show its 3D form from that angle.
`;

async function generateItemDescriptionSet(
  itemCategory: string, itemType: string, material: string, styleKeywords: string, perspective: string,
  variationType: string, systemPrompt: string,
  activeProjectStoryContext?: string 
): Promise<ItemDescriptionJson> {
    const itemCategoryLabel = itemCategories.find(c => c.value === itemCategory)?.label || itemCategory;
    const itemTypeLabel = itemTypesByCategory[itemCategory]?.find(t => t.value === itemType)?.label || itemType;
    const perspectiveLabel = gamePerspectiveOptions.find(p => p.value === perspective)?.label || perspective;
    const variationInstruction = itemVariationInstructionsMap[variationType] || "Describe a subtle visual change for hover, and a more pronounced one for active.";

    let projectStoryPromptPart = "";
    if (activeProjectStoryContext) {
      projectStoryPromptPart = `\n\n--- ACTIVE PROJECT STORY CONTEXT ---\n${activeProjectStoryContext}\n----------------------------------\n Guideline: Use the above story context to influence the item's theme, materials, and style to ensure it aligns with the project's narrative. Consider especially the '${styleKeywords}' when deriving from the context.`;
    }


    const textParts = [
        {text: `Item Category: ${itemCategoryLabel}`},
        {text: `Item Type: ${itemTypeLabel}`},
        {text: `Material/Primary Color: ${material}`},
        {text: `Style Keywords: ${styleKeywords}`},
        {text: `Game Perspective: ${perspectiveLabel}`},
        {text: `The item variation type is '${itemVariationTypeOptions.find(o => o.value === variationType)?.label || variationType}'. Apply this instruction: ${variationInstruction}`},
        {text: projectStoryPromptPart} 
    ];
    
    const result = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: { parts: textParts },
        config: { systemInstruction: systemPrompt, responseMimeType: 'application/json', temperature: 0.7 }
    });

    let jsonStr = result.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();
    
    try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.variants?.default?.prompt && parsed.itemConcept) {
            if (!parsed.itemCategory) parsed.itemCategory = itemCategoryLabel;
            if (!parsed.itemType) parsed.itemType = itemTypeLabel;
            return parsed as ItemDescriptionJson;
        }
        throw new Error("Generated item description JSON is not in the expected format.");
    } catch (e: any) {
        console.error("Failed to parse item JSON:", e, "Raw:", jsonStr);
        throw new Error(`Failed to parse item JSON: ${e.message}`);
    }
}

function downloadTextFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement('a');
  const file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadFileFromUrl(url: string, fileName: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function generateSingleImage(prompt: string): Promise<string> { 
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('Invalid prompt provided for image generation.');
  }
  const response = await ai.models.generateImages({
    model: IMAGE_MODEL_NAME,
    prompt: prompt,
    config: {numberOfImages: 1, outputMimeType: 'image/png'},
  });

  if (response.generatedImages?.[0]?.image?.imageBytes) {
    return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
  }
  throw new Error('No image generated or unexpected response format.');
}


export default function ItemGenerator({ 
    navigateTo, appName, 
    savedAssets, setSavedAssets, 
    projects, setProjects, activeProjectId, 
    isStorageFull, prefillState, clearPrefillState 
}: ItemGeneratorProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);

  const [selectedItemCategory, setSelectedItemCategory] = useState<string>(itemCategories[0].value);
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [itemMaterial, setItemMaterial] = useState<string>('');
  const [itemStyleKeywords, setItemStyleKeywords] = useState<string>('');
  const [selectedPerspective, setSelectedPerspective] = useState<string>('isometric'); 
  const [selectedVariationType, setSelectedVariationType] = useState<string>(itemVariationTypeOptions[0].value);
  const [itemDurability, setItemDurability] = useState<string>('');

  const [generatedItemDescription, setGeneratedItemDescription] = useState<ItemDescriptionJson | null>(null);
  const [generatedItemImageUrls, setGeneratedItemImageUrls] = useState<ItemImageUrls>({ default: null, hover: null, active: null });
  
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectStoryAsset = activeProject?.storyConceptId 
    ? savedAssets.find(a => a.id === activeProject.storyConceptId && a.assetType === 'storyConcept')
    : null;
  const projectStoryContext = activeProjectStoryAsset ? (activeProjectStoryAsset as any).content?.substring(0, 1000) + "..." : undefined;

  useEffect(() => {
    if (prefillState.targetPage === 'item-generator' && prefillState.data && prefillState.field === 'itemTheme') {
      // For items, the "theme" from checklist can be used as initial style keywords
      setItemStyleKeywords(prefillState.data);
      // Optionally, try to infer category/type if possible, or set a general material
      // For now, just setting style keywords and material.
      setItemMaterial(prefillState.data.split(' ')[0]); // Simple heuristic for material
      clearPrefillState();
    }
  }, [prefillState, clearPrefillState]);


  useEffect(() => {
    const storedUser = localStorage.getItem('spriteForgeUser');
    if (storedUser) {
      const user = JSON.parse(storedUser); setIsLoggedIn(true); setCurrentUserEmail(user.email);
    }
    if (itemCategories[0]?.value && itemTypesByCategory[itemCategories[0].value]?.length > 0) {
        setSelectedItemType(itemTypesByCategory[itemCategories[0].value][0].value);
    }
  }, []);

  useEffect(() => { 
    const types = itemTypesByCategory[selectedItemCategory];
    if (types?.length > 0) {
      setSelectedItemType(types[0].value);
    } else {
      setSelectedItemType('');
    }
  }, [selectedItemCategory]);

  const handleLogin = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); setLoginModalOpen(false); };
  const handleSignup = (email: string) => { setIsLoggedIn(true); setCurrentUserEmail(email); localStorage.setItem('spriteForgeUser', JSON.stringify({ email })); setSignupModalOpen(false); };
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUserEmail(null); localStorage.removeItem('spriteForgeUser'); };

  const handleGenerateItem = async () => {
    if (!selectedItemCategory || !selectedItemType || !itemMaterial.trim() || !itemStyleKeywords.trim()) {
      setErrorDetails({ title: "Input Required", message: "Please fill in all item details: Category, Type, Material, and Style Keywords." });
      return;
    }
    setDescriptionLoading(true);
    setImagesLoading(false); 
    setGeneratedItemDescription(null);
    setGeneratedItemImageUrls({ default: null, hover: null, active: null });
    setHasStartedGenerating(true);
    setErrorDetails(null);

    try {
      const desc = await generateItemDescriptionSet(
        selectedItemCategory, selectedItemType, itemMaterial, itemStyleKeywords, selectedPerspective, selectedVariationType, defaultItemSystemPrompt,
        projectStoryContext 
      );
      setGeneratedItemDescription(desc);
      await handleGenerateImages(desc); 
    } catch (error: any) {
      setErrorDetails({ title: "Item Generation Failed", message: `Could not generate item description or images: ${error.message}` });
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleGenerateImages = async (description: ItemDescriptionJson | null = generatedItemDescription) => {
    if (!description) {
      setErrorDetails({ title: "Error", message: "Item description not available to generate images." });
      return;
    }
    setImagesLoading(true);
    setErrorDetails(null);
    const newImageUrls: ItemImageUrls = { default: null, hover: null, active: null };
    try {
      newImageUrls.default = await generateSingleImage(description.variants.default.prompt);
      setGeneratedItemImageUrls(prev => ({...prev, default: newImageUrls.default}));
      newImageUrls.hover = await generateSingleImage(description.variants.hover.prompt);
      setGeneratedItemImageUrls(prev => ({...prev, hover: newImageUrls.hover}));
      newImageUrls.active = await generateSingleImage(description.variants.active.prompt);
      setGeneratedItemImageUrls(prev => ({...prev, active: newImageUrls.active}));
    } catch (error: any) {
      setErrorDetails({ title: "Image Generation Error", message: `Failed to generate one or more item images: ${error.message}` });
    } finally {
      setImagesLoading(false);
    }
  };
  
  const handleSaveItem = (variantKey: 'default' | 'hover' | 'active', imageUrl: string) => {
    if (isStorageFull) {
      setErrorDetails({ title: "Storage Full", message: "Cannot save item. Browser storage is full." });
      return;
    }
    if (!generatedItemDescription || !imageUrl) return;

    const numDurability = parseInt(itemDurability, 10);
    
    const newItemAsset: ItemAsset = {
      id: `item-${generatedItemDescription.itemType || 'unknown'}-${variantKey}-${Date.now()}`,
      assetType: 'item',
      name: generatedItemDescription.itemConcept || 'Untitled Item',
      timestamp: Date.now(),
      imageUrl,
      variantKey,
      itemConcept: generatedItemDescription.itemConcept,
      prompt: generatedItemDescription.variants[variantKey].prompt,
      itemCategory: generatedItemDescription.itemCategory || selectedItemCategory,
      itemType: generatedItemDescription.itemType || selectedItemType,
      gamePerspective: selectedPerspective,
      projectId: activeProjectId || undefined,
      durabilityOrQuantity: !isNaN(numDurability) && numDurability > 0 ? numDurability : undefined,
    };
    setSavedAssets(prev => [...prev, newItemAsset]);

    if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) {
                return {
                    ...p,
                    linkedAssetIds: {
                        ...p.linkedAssetIds,
                        items: [...p.linkedAssetIds.items, newItemAsset.id]
                    }
                };
            }
            return p;
        }));
    }
  };
  
  const isItemSaved = (variantKey: 'default'|'hover'|'active') => {
      const currentImageUrl = generatedItemImageUrls[variantKey];
      if(!generatedItemDescription || !currentImageUrl) return false;
      
      return savedAssets.some(asset => 
        asset.assetType === 'item' &&
        (asset as ItemAsset).imageUrl === currentImageUrl &&
        (asset as ItemAsset).variantKey === variantKey &&
        (asset as ItemAsset).itemType === (generatedItemDescription.itemType || selectedItemType) &&
        asset.name === generatedItemDescription.itemConcept &&
        ((asset as ItemAsset).projectId === activeProjectId || (!activeProjectId && !(asset as ItemAsset).projectId)) 
      );
  };

  const handleClearAll = () => {
    setSelectedItemCategory(itemCategories[0].value);
    setItemMaterial('');
    setItemStyleKeywords('');
    setSelectedPerspective('isometric');
    setSelectedVariationType(itemVariationTypeOptions[0].value);
    setItemDurability('');
    setGeneratedItemDescription(null);
    setGeneratedItemImageUrls({ default: null, hover: null, active: null });
    setDescriptionLoading(false);
    setImagesLoading(false);
    setHasStartedGenerating(false);
    setErrorDetails(null);
    clearPrefillState(); // Also clear prefill if user manually clears
  };
  
  const currentItemTypes = itemTypesByCategory[selectedItemCategory] || [];
  const mainContentDisabled = descriptionLoading || imagesLoading;
  const saveButtonDisabled = mainContentDisabled || isStorageFull;

  const categoryIconMap: Record<string, React.FC<any>> = {
    weapon: Sword,
    armor: ShieldIcon,
    accessory: Gem,
    consumable: WandSparkles,
    misc_loot: Scroll,
  };
  const CategoryIcon = categoryIconMap[selectedItemCategory] || Settings2;

  const showDurabilityField = ['weapon', 'armor', 'consumable', 'misc_loot'].includes(selectedItemCategory);
  let durabilityFieldLabel = '';
  if (selectedItemCategory === 'weapon' || selectedItemCategory === 'armor') {
      durabilityFieldLabel = 'Durability (Optional)';
  } else if (selectedItemCategory === 'consumable' || selectedItemCategory === 'misc_loot') {
      durabilityFieldLabel = 'Quantity (Optional)';
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(false)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo} />

      <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <section aria-labelledby="item-gen-title">
            <h1 id="item-gen-title" className="h1-style text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">AI Item & Gear Generator</h1>
            {activeProject && (
                <div className="text-center text-sm text-[var(--accent-gold)] mb-3 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] max-w-md mx-auto">
                    Working within project: <strong>{activeProject.name}</strong>
                    {projectStoryContext && <p className="text-xs text-[var(--text-placeholder)] mt-1 truncate">Context: {projectStoryContext}</p>}
                </div>
            )}
            <p className="text-lg text-[var(--text-secondary)] text-center max-w-3xl mx-auto">Design unique weapons, armor, potions, and more for your RPG. Describe the item, and let AI bring it to life.</p>
          </section>

          <section aria-labelledby="item-config-heading" className="card-style">
            <h2 id="item-config-heading" className="h3-style mb-1 flex items-center"><CategoryIcon size={24} className="mr-3 text-[var(--accent-gold)]" /> Item Configuration</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Define the properties of the item you want to generate.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="item-category" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Item Category</label>
                <div className="relative">
                  <select id="item-category" value={selectedItemCategory} onChange={e => setSelectedItemCategory(e.target.value)} className="form-select" disabled={mainContentDisabled}>
                    {itemCategories.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="item-type" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Item Type</label>
                <div className="relative">
                  <select id="item-type" value={selectedItemType} onChange={e => setSelectedItemType(e.target.value)} className="form-select" disabled={mainContentDisabled || currentItemTypes.length === 0}>
                    {currentItemTypes.length > 0 ? currentItemTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : <option value="">Select Category First</option>}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="item-material" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Material / Primary Color</label>
                <input type="text" id="item-material" value={itemMaterial} onChange={e => setItemMaterial(e.target.value)} placeholder="e.g., Steel, Leather, Demonic Red" className="form-input" disabled={mainContentDisabled} />
              </div>
              <div>
                <label htmlFor="item-style" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Style Keywords</label>
                <input type="text" id="item-style" value={itemStyleKeywords} onChange={e => setItemStyleKeywords(e.target.value)} placeholder="e.g., Ornate Elven, Brutish Orcish, Ancient" className="form-input" disabled={mainContentDisabled} />
              </div>
              <div>
                <label htmlFor="item-perspective" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Perspective</label>
                <div className="relative">
                  <select id="item-perspective" value={selectedPerspective} onChange={e => setSelectedPerspective(e.target.value)} className="form-select" disabled={mainContentDisabled}>
                    {gamePerspectiveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
                </div>
              </div>
               <div>
                <label htmlFor="item-variation-type" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Variation Type (Default/Hover/Active)</label>
                <div className="relative">
                  <select id="item-variation-type" value={selectedVariationType} onChange={e => setSelectedVariationType(e.target.value)} className="form-select" disabled={mainContentDisabled}>
                    {itemVariationTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
                </div>
              </div>
              {showDurabilityField && (
                    <div className="md:col-span-2">
                        <label htmlFor="item-durability" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{durabilityFieldLabel}</label>
                        <input
                            type="number"
                            id="item-durability"
                            value={itemDurability}
                            onChange={e => setItemDurability(e.target.value)}
                            placeholder="e.g., 100 or 10"
                            className="form-input"
                            disabled={mainContentDisabled}
                            min="1"
                        />
                    </div>
                )}
            </div>
          </section>

          <section aria-label="Generation Actions" className="mt-6 space-y-3">
            <button type="button" onClick={handleGenerateItem} disabled={mainContentDisabled || !selectedItemType || !itemMaterial || !itemStyleKeywords} className="button-primary w-full !py-3.5 !text-lg flex items-center justify-center">
              <Sparkles size={22} className="mr-2.5" /> Generate Item & Images
            </button>
            <button type="button" onClick={handleClearAll} disabled={mainContentDisabled} className="button-secondary w-full !py-3">
              <Trash2 size={20} className="mr-2.5" /> Clear All Inputs & Results
            </button>
          </section>

          {(descriptionLoading || imagesLoading) && (
            <section className="card-style text-center py-6">
              <div role="status" className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--accent-gold)] border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-3 text-lg text-[var(--accent-gold)]">
                {descriptionLoading ? "Generating item description..." : "Generating item images..."}
              </p>
            </section>
          )}

          {hasStartedGenerating && generatedItemDescription && !descriptionLoading && (
            <section aria-labelledby="generated-item-output" className="card-style">
              <h2 id="generated-item-output" className="h3-style mb-4">Generated Item Output</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <DescriptionPreview description={generatedItemDescription as any} type="sprite" />
                  <button type="button" onClick={() => downloadTextFile(JSON.stringify(generatedItemDescription, null, 2), `item_desc_${generatedItemDescription.itemType || 'custom'}.json`, 'application/json')} className="button-tertiary !text-sm !px-4 !py-2 flex items-center" disabled={mainContentDisabled}>
                    <Download size={16} className="mr-2" /> Download Description (JSON)
                  </button>
                </div>
                <div className="space-y-4">
                  <h4 className="font-display text-xl text-[var(--accent-gold)]">Generated Item Images:</h4>
                  {!imagesLoading && !generatedItemImageUrls.default && (
                     <button type="button" onClick={() => handleGenerateImages()} className="button-secondary w-full" disabled={mainContentDisabled || !generatedItemDescription}>
                        <Redo size={16} className="mr-2" /> Re-Generate Images
                    </button>
                  )}
                  {Object.entries(generatedItemImageUrls).map(([variantKey, imageUrl]) => {
                    if (!imageUrl) return null;
                    const typedVariantKey = variantKey as 'default' | 'hover' | 'active';
                    const isSaved = isItemSaved(typedVariantKey);
                    return (
                      <div key={variantKey} className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                        <h5 className="font-semibold capitalize text-[var(--text-primary)] mb-2">{variantKey} State:</h5>
                        <img src={imageUrl} alt={`Generated ${variantKey} item`} className="w-full max-w-xs mx-auto rounded-md border border-[var(--border-color)] mb-3" />
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button type="button" onClick={() => downloadFileFromUrl(imageUrl, `item_${generatedItemDescription.itemType || 'custom'}_${variantKey}.png`)} className="button-tertiary !text-xs !px-3 !py-1.5 flex items-center" disabled={mainContentDisabled}>
                            <Download size={14} className="mr-1.5" /> Download Image
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleSaveItem(typedVariantKey, imageUrl)} 
                            disabled={saveButtonDisabled || isSaved} 
                            className={`button-tertiary !text-xs !px-3 !py-1.5 flex items-center ${isSaved ? '!text-green-500 hover:!bg-green-500/10' : ''}`}
                            title={isStorageFull ? "Cannot save, storage is full" : (isSaved ? "Already saved" : "Save to Assets")}
                          >
                            <Save size={14} className="mr-1.5" /> {isSaved ? 'Saved to Assets' : 'Save to Assets'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
          
          <section aria-labelledby="quick-actions-heading" className="card-style">
             <h2 id="quick-actions-heading" className="h3-style mb-4 flex items-center">
               <Info size={24} className="mr-3 text-[var(--accent-gold)]" /> Quick Actions
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('home')} disabled={mainContentDisabled}>
                 <Palette size={20} className="mr-2.5" /> Sprite Generator
               </button>
                <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('assets')} disabled={mainContentDisabled}>
                 <LayoutGrid size={20} className="mr-2.5" /> My Assets
               </button>
               <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('playground')} disabled={mainContentDisabled}>
                 <BoxSelect size={20} className="mr-2.5" /> Interactive Playground
               </button>
             </div>
           </section>
        </div>
      </main>

      <footer className="w-full text-center p-6 border-t border-[var(--border-color)] mt-12">
        <p className="text-sm text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} {appName}. AI Item & Gear Generator.</p>
      </footer>

      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}