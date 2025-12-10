/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Page, SavedAsset, RPGSystemAsset, Project, ConceptArtAsset } from './index'; // Added Project
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import { ScrollText, Sparkles, Trash2, Download, UserCog, ShieldPlus, BookCopy, Palette, Map, LayoutGrid, BoxSelect, Info, ChevronDown, Save, Settings2, XCircle, Image as ImageIcon } from 'lucide-react';

const TEXT_MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface RPGSystemGeneratorProps {
  navigateTo: (page: Page) => void;
  appName: string;
  savedAssets: SavedAsset[];
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; // Added setProjects
  activeProjectId: string | null;
  isStorageFull: boolean; // Added
}

type SystemSection = 'character_stats' | 'item_affixes' | 'spell_ability_concepts';

const systemSectionOptions: { value: SystemSection; label: string; icon: React.FC<any>, description: string }[] = [
    { value: 'character_stats', label: 'Character Stats & Progression', icon: UserCog, description: "Define core attributes, derived stats, resource systems, and class mechanics for player characters."},
    { value: 'item_affixes', label: 'Item Affixes & Properties', icon: ShieldPlus, description: "Generate magical properties, bonuses, and effects for different types and rarities of game items."},
    { value: 'spell_ability_concepts', label: 'Spell & Ability Concepts', icon: BookCopy, description: "Create detailed concepts for spells or abilities, including names, effects, parameters, and potential upgrades."}
];

const rpgCharacterClasses = [
    { value: 'warrior', label: 'Warrior/Fighter' }, { value: 'mage', label: 'Mage/Wizard' }, { value: 'rogue', label: 'Rogue/Assassin' },
    { value: 'cleric', label: 'Cleric/Priest' }, { value: 'paladin', label: 'Paladin' }, { value: 'ranger', label: 'Ranger/Hunter' },
    { value: 'barbarian', label: 'Barbarian' }, { value: 'druid', label: 'Druid' }, { value: 'necromancer', label: 'Necromancer' },
    { value: 'bard', label: 'Bard' }, { value: 'monk', label: 'Monk' }, { value: 'custom', label: 'Custom/Other' }
];
const itemRarities = [
    { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon (Magic)' }, { value: 'rare', label: 'Rare' },
    { value: 'epic', label: 'Epic (Legendary)' }, { value: 'unique', label: 'Unique/Artifact' }
];
const spellSchools = [
    { value: 'fire', label: 'Fire Magic' }, { value: 'frost', label: 'Frost/Ice Magic' }, { value: 'lightning', label: 'Lightning/Storm Magic' },
    { value: 'arcane', label: 'Arcane/Pure Magic' }, { value: 'holy', label: 'Holy/Light Magic' }, { value: 'shadow', label: 'Shadow/Dark Magic' },
    { value: 'nature', label: 'Nature/Earth Magic' }, { value: 'poison', label: 'Poison/Acid Magic' }, { value: 'physical', label: 'Physical Combat Skill' },
    { value: 'buff_debuff', label: 'Buffs & Debuffs' }, { value: 'healing', label: 'Healing & Restoration' }, { value: 'utility', label: 'Utility/Misc.'}
];
const itemTypeExamples = ['Sword', 'Helmet', 'Axe', 'Staff', 'Ring', 'Amulet', 'Chest Armor', 'Boots', 'Shield'];

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

async function generateAISystemConcept(section: SystemSection, inputs: any, activeProjectStoryContext?: string): Promise<string> {
  let promptContent = ""; // Renamed from prompt to avoid conflict with inputs.prompt
  const baseInstruction = "You are an expert game designer specializing in RPG systems. Generate a detailed and creative concept based on the user's inputs. Output in Markdown format.\n\n";

  let projectStoryPromptPart = "";
    if (activeProjectStoryContext) {
    projectStoryPromptPart = `**Overall Project Story Context:**\n${activeProjectStoryContext}\n(Use this story context to inform the generated RPG system concepts, ensuring thematic alignment with the project's narrative.)\n\n`;
  }
  promptContent += projectStoryPromptPart; // Add project context at the beginning
  promptContent += baseInstruction; // Then add the base instruction

  switch (section) {
    case 'character_stats':
      promptContent += `### Character Stat Block Concept
**Character Class:** ${inputs.charClassLabel || inputs.customCharClass || 'N/A'}
**Target Level/Stage:** ${inputs.level || 'Early Game'}

**1. Core Attributes:**
   - List 4-6 primary attributes (e.g., Strength, Dexterity, Intellect, Vitality, Wisdom, Charisma).
   - Briefly define what each attribute governs. (e.g., Strength: Increases physical damage and carrying capacity. Intellect: Boosts magic power and mana pool).

**2. Derived Stats:**
   - List key combat and utility stats derived from core attributes or base values (e.g., Health, Mana/Resource, Stamina, Physical Attack, Magical Power, Defense, Critical Hit Chance, Movement Speed).
   - Explain how some of these might be calculated or influenced by core attributes (e.g., "Health = Vitality * 10 + Base Health").

**3. Resource System(s):**
   - Describe the primary resource(s) this class uses for abilities (e.g., Mana, Rage, Energy, Stamina, Soul Shards).
   - How is this resource generated and consumed? Be creative (e.g., "Rage is generated by dealing and taking damage, and decays outside of combat.").

**4. Unique Class Mechanics/Passives (1-2 ideas):**
   - Suggest one or two unique gameplay mechanics, passive abilities, or signature traits that define this class's playstyle.
   - Example: A Warrior might have a 'Battle Stance' system, a Mage 'Elemental Attunement', a Rogue 'Combo Points'.

**5. Stat Progression Feel:**
   - Briefly describe how this class should feel as it levels up regarding its stats (e.g., "Becomes increasingly resilient," "Unlocks devastating magical power," "Gains unparalleled agility and burst damage").
`;
      break;
    case 'item_affixes':
      promptContent += `### Item Affix Concepts
**Item Type:** ${inputs.itemType || 'Generic Item'}
**Item Rarity:** ${inputs.rarityLabel || 'N/A'}

**Generated Affixes (provide 5-7 diverse examples):**
List potential magical properties (affixes) suitable for this item type and rarity. Each affix should be concise and clearly state its effect.
Consider a mix of:
   - **Core attribute bonuses:** (e.g., +Strength, +Intelligence)
   - **Offensive stats:** (e.g., +Attack Damage, +Critical Hit Chance, Adds Fire Damage)
   - **Defensive stats:** (e.g., +Health, +Armor, +Fire Resistance)
   - **Utility stats:** (e.g., +Movement Speed, Cooldown Reduction, Increased Gold Find)
   - **Conditional / Proc effects:** (e.g., "Chance on hit to cast X", "On kill, gain Y", "On block, Z")
   - **Skill-altering effects:** (e.g., "+1 to [Specific Skill]", "Your [Skill Name] now also [adds effect]")

Format each affix clearly, for example:
   - "+[Value] [Stat Name]" (e.g., "+15 Dexterity")
   - "[Percentage]% [Effect]" (e.g., "10% Increased Attack Speed")
   - "[Effect Description]" (e.g., "Grants Aura of Swiftness")
   - "On Hit: [Effect]" (e.g., "On Hit: 5% chance to unleash a chain lightning.")

Tailor the affixes to be thematic for the rarity. Higher rarities should have more impactful or unique affixes.
`;
      break;
    case 'spell_ability_concepts':
      promptContent += `### Spell/Ability Concept
**Spell School/Type:** ${inputs.spellSchoolLabel || 'N/A'}
**Intended Character Class (Optional):** ${inputs.spellCharClassLabel || inputs.customSpellCharClass || 'Any'}

**1. Spell/Ability Name:**
   - Suggest a thematic and evocative name.

**2. Description (Flavor & Mechanics):**
   - **Flavor Text:** A short, immersive description of what the spell/ability is or does.
   - **Mechanical Effect:** Clearly explain its gameplay function (e.g., deals damage, heals, controls enemies, provides a buff/debuff).

**3. Key Parameters (Examples - adjust as needed for the concept):**
   - **Damage Type (if applicable):** (e.g., Fire, Cold, Physical, Arcane, Chaos)
   - **Damage/Healing Amount (Conceptual):** (e.g., "Moderate," "High burst," "Scales with Magical Power at 150%")
   - **Area of Effect (if applicable):** (e.g., Single Target, Cone, Radius around caster, Projectile, Chain)
   - **Resource Cost (Conceptual):** (e.g., "Low Mana," "Significant Rage," "Uses 1 Charge")
   - **Cooldown (Conceptual):** (e.g., "Short (5s)," "Long (30s)," "No Cooldown")
   - **Casting Time/Speed (Conceptual):** (e.g., "Instant," "Short Cast (1.5s)," "Channeled")
   - **Duration (if applicable for buffs/debuffs/DoTs):** (e.g., "10 seconds," "Until cancelled")
   - **Range:** (e.g., "Melee", "30 meters")

**4. Potential Upgrade Paths or Synergies (1-2 ideas):**
   - How could this spell/ability be improved or modified through a skill tree or item effects? (e.g., "Upgrade 1: Increases radius by 50%." "Upgrade 2: Now also applies a slowing effect.")
`;
      break;
    default:
      console.error("Invalid RPG system section:", section);
      throw new Error(`Invalid RPG system section provided: ${section}`);
  }

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: promptContent,
    });
    return response.text;
  } catch (error) {
    console.error("AI System Concept Generation Error:", error);
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


function RPGSystemGenerator({ navigateTo, appName, savedAssets, setSavedAssets, projects, setProjects, activeProjectId, isStorageFull }: RPGSystemGeneratorProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string } | null>(null);

  const [selectedSection, setSelectedSection] = useState<SystemSection>(systemSectionOptions[0].value);
  
  // Inputs for Character Stats
  const [charClass, setCharClass] = useState<string>(rpgCharacterClasses[0].value);
  const [customCharClass, setCustomCharClass] = useState<string>('');
  const [charLevel, setCharLevel] = useState<string>('Early Game');

  // Inputs for Item Affixes
  const [itemType, setItemType] = useState<string>(itemTypeExamples[0]);
  const [customItemType, setCustomItemType] = useState<string>('');
  const [itemRarity, setItemRarity] = useState<string>(itemRarities[0].value);

  // Inputs for Spell/Ability Concepts
  const [spellSchool, setSpellSchool] = useState<string>(spellSchools[0].value);
  const [spellCharClass, setSpellCharClass] = useState<string>(rpgCharacterClasses[0].value);
  const [customSpellCharClass, setCustomSpellCharClass] = useState<string>('');

  const [generatedConcept, setGeneratedConcept] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  const [lastSavedConcept, setLastSavedConcept] = useState<RPGSystemAsset | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectStoryAsset = activeProject?.storyConceptId 
    ? savedAssets.find(a => a.id === activeProject.storyConceptId && a.assetType === 'storyConcept')
    : null;
  const projectStoryContext = activeProjectStoryAsset ? (activeProjectStoryAsset as any).content?.substring(0, 1000) + "..." : undefined;


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
    let inputs: any = {};
    let validInputs = true;

    switch (selectedSection) {
      case 'character_stats':
        if (charClass === 'custom' && !customCharClass.trim()) { setErrorDetails({ title: "Input Required", message: "Please enter a custom character class name." }); validInputs = false; }
        inputs = { charClassLabel: rpgCharacterClasses.find(c=>c.value === charClass)?.label, customCharClass, level: charLevel };
        break;
      case 'item_affixes':
        if (!itemType.trim() && !customItemType.trim()) { setErrorDetails({ title: "Input Required", message: "Please select or enter an item type." }); validInputs = false; }
        inputs = { itemType: customItemType.trim() || itemType, rarityLabel: itemRarities.find(r=>r.value === itemRarity)?.label };
        break;
      case 'spell_ability_concepts':
         if (spellCharClass === 'custom' && !customSpellCharClass.trim()) { setErrorDetails({ title: "Input Required", message: "Please enter a custom character class name for the spell." }); validInputs = false; }
        inputs = { spellSchoolLabel: spellSchools.find(s=>s.value === spellSchool)?.label, spellCharClassLabel: rpgCharacterClasses.find(c=>c.value === spellCharClass)?.label, customSpellCharClass };
        break;
        default: setErrorDetails({ title: "Invalid Section", message: "An unexpected section was selected." }); validInputs = false;
    }

    if (!validInputs) return;

    setIsLoading(true); setGeneratedConcept(null); setHasGenerated(true); setErrorDetails(null);
    setIllustrationUrl(null); setLastSavedConcept(null);

    try {
      const concept = await generateAISystemConcept(selectedSection, inputs, projectStoryContext);
      setGeneratedConcept(concept);
    } catch (error: any) {
      console.error('Error generating RPG system concept:', error);
      setErrorDetails({ title: "Concept Generation Failed", message: `Could not generate concept: ${error.message || 'Unknown error'}. Please try again.` });
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
        const conceptName = lastSavedConcept?.name || "RPG Concept";
        const prompt = `Concept art for a game, high quality digital painting, atmospheric, detailed. The image should represent: "${conceptName}". Additional details: ${generatedConcept.substring(0, 500)}`;
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
        const sectionLabel = systemSectionOptions.find(s => s.value === selectedSection)?.label.replace(/[^a-zA-Z0-9]/g, '') || 'concept';
        const fileName = `rpg_system_${sectionLabel}_${Date.now()}.md`;
        downloadTextFile(generatedConcept, fileName, 'text/markdown;charset=utf-8');
    }
  };
  
  const handleSaveConcept = () => {
    if (isStorageFull) { setErrorDetails({ title: "Storage Full", message: "Cannot save concept. Browser storage is full." }); return; }
    if (!generatedConcept) { setErrorDetails({ title: "Cannot Save", message: "No generated concept to save." }); return; }

    let namePrefix = systemSectionOptions.find(opt => opt.value === selectedSection)?.label || "RPG System";
    let configDetails: any = {};
    switch(selectedSection) {
        case 'character_stats': namePrefix = `${charClass === 'custom' ? customCharClass : rpgCharacterClasses.find(c=>c.value === charClass)?.label} Stats`; configDetails = { charClass, customCharClass, level: charLevel}; break;
        case 'item_affixes': namePrefix = `${customItemType || itemType} Affixes (${itemRarities.find(r=>r.value === itemRarity)?.label})`; configDetails = { itemType, customItemType, itemRarity }; break;
        case 'spell_ability_concepts': namePrefix = `${spellSchools.find(s=>s.value === spellSchool)?.label} Spell for ${spellCharClass === 'custom' ? customSpellCharClass : rpgCharacterClasses.find(c=>c.value === spellCharClass)?.label}`; configDetails = { spellSchool, spellCharClass, customSpellCharClass }; break;
    }

    const newRPGAsset: RPGSystemAsset = {
        id: `rpgsys-${selectedSection}-${Date.now()}`, assetType: 'rpgSystemData', name: namePrefix, timestamp: Date.now(),
        systemSection: selectedSection, configDetails: configDetails, content: generatedConcept, projectId: activeProjectId || undefined,
    };
    setSavedAssets(prev => [...prev, newRPGAsset]);
    setLastSavedConcept(newRPGAsset);

     if (activeProjectId) {
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProjectId) { return { ...p, linkedAssetIds: { ...p.linkedAssetIds, rpgSystems: [...p.linkedAssetIds.rpgSystems, newRPGAsset.id] }}; }
            return p;
        }));
    }
  };

  const handleSaveIllustration = () => {
      if (!illustrationUrl || !lastSavedConcept || isStorageFull) { setErrorDetails({title: "Cannot Save", message: "Illustration or original concept not available."}); return; }
      const newArtAsset: ConceptArtAsset = {
          id: `conceptArt-${lastSavedConcept.id}-${Date.now()}`, assetType: 'conceptArt', name: `Illustration for "${lastSavedConcept.name}"`, timestamp: Date.now(), imageUrl: illustrationUrl,
          prompt: `Illustration of: ${lastSavedConcept.name}`, sourceAssetId: lastSavedConcept.id, sourceAssetType: 'rpgSystemData', projectId: activeProjectId || undefined,
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

  const isConceptSaved = () => {
    if (!generatedConcept) return false;
    return savedAssets.some(asset => asset.assetType === 'rpgSystemData' && (asset as RPGSystemAsset).content === generatedConcept);
  };
  const isIllustrationSaved = () => {
      if (!illustrationUrl) return false;
      return savedAssets.some(asset => asset.assetType === 'conceptArt' && (asset as ConceptArtAsset).imageUrl === illustrationUrl);
  };

  const handleClearAll = () => {
    setCustomCharClass(''); setCharLevel('Early Game'); setCharClass(rpgCharacterClasses[0].value);
    setCustomItemType(''); setItemType(itemTypeExamples[0]); setItemRarity(itemRarities[0].value);
    setCustomSpellCharClass(''); setSpellCharClass(rpgCharacterClasses[0].value); setSpellSchool(spellSchools[0].value);
    setGeneratedConcept(null); setIsLoading(false); setHasGenerated(false); setErrorDetails(null);
    setIllustrationUrl(null); setLastSavedConcept(null);
  };
  
  const mainContentDisabled = isLoading || isIllustrating;
  const conceptSaved = isConceptSaved();
  const saveButtonDisabled = conceptSaved || mainContentDisabled || isStorageFull;
  const CurrentSectionIcon = systemSectionOptions.find(opt => opt.value === selectedSection)?.icon || Settings2;
  const illustrationSaved = isIllustrationSaved();


  const renderSectionInputs = () => {
    switch (selectedSection) {
      case 'character_stats':
        return (<div className="space-y-4"><div><label htmlFor="char-class" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Character Class</label><div className="relative"><select id="char-class" value={charClass} onChange={e => setCharClass(e.target.value)} className="form-select" disabled={mainContentDisabled}>{rpgCharacterClasses.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div>{charClass === 'custom' && (<input type="text" value={customCharClass} onChange={e => setCustomCharClass(e.target.value)} placeholder="Enter Custom Class Name" className="form-input mt-2" disabled={mainContentDisabled}/>)}</div><div><label htmlFor="char-level" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Target Level/Stage</label><input type="text" id="char-level" value={charLevel} onChange={e => setCharLevel(e.target.value)} placeholder="e.g., Early Game, Mid-game, Level 50" className="form-input" disabled={mainContentDisabled} /></div></div>);
      case 'item_affixes':
        return (<div className="space-y-4"><div><label htmlFor="item-type-select" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Base Item Type (Example)</label><div className="relative"><select id="item-type-select" value={itemType} onChange={e => { setItemType(e.target.value); setCustomItemType('');}} className="form-select" disabled={mainContentDisabled}>{itemTypeExamples.map(type => <option key={type} value={type}>{type}</option>)}<option value="">Or Enter Custom Below...</option></select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div><input type="text" value={customItemType} onChange={e => {setCustomItemType(e.target.value); if (e.target.value) setItemType('');}} placeholder="Enter Custom Item Type if not listed" className="form-input mt-2" disabled={mainContentDisabled}/></div><div><label htmlFor="item-rarity" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Item Rarity</label><div className="relative"><select id="item-rarity" value={itemRarity} onChange={e => setItemRarity(e.target.value)} className="form-select" disabled={mainContentDisabled}>{itemRarities.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div></div></div>);
      case 'spell_ability_concepts':
        return (<div className="space-y-4"><div><label htmlFor="spell-school" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Spell School / Type</label><div className="relative"><select id="spell-school" value={spellSchool} onChange={e => setSpellSchool(e.target.value)} className="form-select" disabled={mainContentDisabled}>{spellSchools.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div></div><div><label htmlFor="spell-char-class" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Intended Character Class (Optional)</label><div className="relative"><select id="spell-char-class" value={spellCharClass} onChange={e => setSpellCharClass(e.target.value)} className="form-select" disabled={mainContentDisabled}><option value="any">Any/Universal</option>{rpgCharacterClasses.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div>{spellCharClass === 'custom' && (<input type="text" value={customSpellCharClass} onChange={e => setCustomSpellCharClass(e.target.value)} placeholder="Enter Custom Class Name" className="form-input mt-2" disabled={mainContentDisabled}/>)}</div></div>);
      default:
        return <p className="text-red-500">Error: Unknown section selected.</p>;
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header appName={appName} isLoggedIn={isLoggedIn} currentUserEmail={currentUserEmail} onLoginClick={() => setLoginModalOpen(true)} onSignupClick={() => setSignupModalOpen(true)} onLogoutClick={handleLogout} onLegalClick={() => setLegalModalOpen(true)} onTosClick={() => setTosModalOpen(true)} navigateTo={navigateTo}/>
      <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <section aria-labelledby="rpg-system-title">
            <h1 id="rpg-system-title" className="h1-style text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">AI RPG System Generator</h1>
             {activeProject && (<div className="text-center text-sm text-[var(--accent-gold)] mb-3 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] max-w-md mx-auto">Working within project: <strong>{activeProject.name}</strong>{projectStoryContext && <p className="text-xs text-[var(--text-placeholder)] mt-1 truncate">Context: {projectStoryContext}</p>}</div>)}
            <p className="text-lg text-[var(--text-secondary)] text-center max-w-3xl mx-auto">Generate foundational concepts for your RPG's mechanics, from character stats to item properties and spell designs.</p>
          </section>

          <section aria-labelledby="system-config-heading" className="card-style">
             <h2 id="system-config-heading" className="h3-style mb-1 flex items-center"><CurrentSectionIcon size={24} className="mr-3 text-[var(--accent-gold)]" /> RPG System Configuration</h2>
             <p className="text-sm text-[var(--text-secondary)] mb-4">{systemSectionOptions.find(opt => opt.value === selectedSection)?.description || "Select a system area and provide details to generate concepts."}</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-1">
                    <label htmlFor="system-section" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">System Section</label>
                    <div className="relative"><select id="system-section" value={selectedSection} onChange={(e) => {setSelectedSection(e.target.value as SystemSection); setGeneratedConcept(null); setHasGenerated(false);}} className="form-select" disabled={mainContentDisabled}>{systemSectionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" /></div>
                </div>
                <div className="md:col-span-2">{renderSectionInputs()}</div>
            </div>
          </section>
          
          <section aria-label="Generation Actions" className="mt-6 space-y-3">
            <button type="button" onClick={handleGenerateConcept} disabled={mainContentDisabled} className="button-primary w-full !py-3.5 !text-lg flex items-center justify-center"><Sparkles size={22} className="mr-2.5" />Generate System Concept</button>
            <button type="button" onClick={handleClearAll} disabled={mainContentDisabled} className="button-secondary w-full !py-3"><Trash2 size={20} className="mr-2.5" />Clear Inputs & Concept</button>
          </section>

          {(isLoading || isIllustrating) && (<section aria-live="polite" className="card-style text-center py-8"><div role="status" className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--accent-gold)] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" /><p className="mt-3 text-lg text-[var(--accent-gold)]">{isLoading ? 'Generating system concept...' : 'Illustrating concept...'}</p></section>)}

          {!isLoading && hasGenerated && generatedConcept && (
            <section aria-labelledby="generated-concept-heading" className="card-style">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 id="generated-concept-heading" className="h3-style flex items-center mb-2 sm:mb-0"><ScrollText size={24} className="mr-3 text-[var(--accent-gold)]" /> Generated System Concept</h2>
                <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={handleDownloadConcept} className="button-tertiary !text-sm !px-4 !py-2 flex items-center"><Download size={16} className="mr-2" /> Download (.md)</button>
                    <button type="button" onClick={handleSaveConcept} disabled={saveButtonDisabled} title={isStorageFull ? "Cannot save, storage is full" : (conceptSaved ? "Already saved" : "Save to Assets")} className={`button-tertiary !text-sm !px-4 !py-2 flex items-center ${conceptSaved && !isStorageFull ? '!text-green-500 hover:!bg-green-500/10' : ''}`}><Save size={16} className="mr-2" /> {conceptSaved ? 'Saved to Assets' : 'Save to Assets'}</button>
                </div>
              </div>
              <div className="prose-modals max-h-[70vh] overflow-y-auto bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-lg border border-[var(--border-color)]"><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownDisplayComponents}>{generatedConcept}</ReactMarkdown></div>
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                 <button onClick={handleIllustrateConcept} disabled={mainContentDisabled || !lastSavedConcept} className="button-secondary w-full mb-4" title={!lastSavedConcept ? "Save the text concept first to enable illustration" : "Illustrate Concept"}><ImageIcon size={18} className="mr-2"/>Illustrate Concept</button>
                 {illustrationUrl && (
                    <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                        <img src={illustrationUrl} alt="Generated RPG illustration" className="w-full h-auto rounded-md border border-[var(--border-color)]"/>
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => downloadFileFromUrl(illustrationUrl, `illustration_${lastSavedConcept?.name.replace(/ /g, '_')}.png`)} className="button-tertiary flex-1 !text-sm"><Download size={16} className="mr-2"/>Download Art</button>
                            <button onClick={handleSaveIllustration} disabled={isStorageFull || illustrationSaved} className={`button-tertiary flex-1 !text-sm ${illustrationSaved ? '!text-green-500' : ''}`}><Save size={16} className="mr-2"/>{illustrationSaved ? 'Saved' : 'Save Art'}</button>
                        </div>
                    </div>
                 )}
              </div>
            </section>
          )}
          
          {!isLoading && hasGenerated && !generatedConcept && !errorDetails && (<section className="text-center py-10 card-style"><XCircle size={48} className="mx-auto text-red-500 mb-3" /><h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">No Concept Generated</h2><p className="text-[var(--text-secondary)]">The AI did not produce a concept. This might be a temporary issue. Please try again or adjust your inputs.</p></section>)}

           <section aria-labelledby="quick-actions-heading" className="card-style mt-8">
             <h2 id="quick-actions-heading" className="h3-style mb-4 flex items-center"><Info size={24} className="mr-3 text-[var(--accent-gold)]" /> Quick Actions</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('home')} disabled={mainContentDisabled}><Palette size={20} className="mr-2.5" /> Sprites</button>
                <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('map-generator')} disabled={mainContentDisabled}><Map size={20} className="mr-2.5" /> Maps</button>
                <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('assets')} disabled={mainContentDisabled}><LayoutGrid size={20} className="mr-2.5" /> Assets</button>
                <button type="button" className="button-secondary w-full flex items-center justify-center !py-3" onClick={() => navigateTo('playground')} disabled={mainContentDisabled}><BoxSelect size={20} className="mr-2.5" /> Playground</button>
             </div>
           </section>
        </div>
      </main>
      <footer className="w-full text-center p-6 border-t border-[var(--border-color)] mt-12"><p className="text-sm text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} {appName}. AI RPG System Generator.</p></footer>
      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}

export default RPGSystemGenerator;