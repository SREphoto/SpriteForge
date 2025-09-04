

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; 
import { X, LogIn, UserPlus, LogOut, FileText, Shield, Palette, UserCircle, Menu, LayoutGrid, BoxSelect, Map, BookText, Sword, ScrollText, ClipboardList, Briefcase } from 'lucide-react'; 

// UserMenuModal for auth/legal links
const UserMenuModal = ({
  isOpen, setIsOpen,
  isLoggedIn, currentUserEmail,
  onLoginClick, onSignupClick, onLogoutClick,
  onLegalClick, onTosClick, appName, navigateTo 
}) => {
  const menuContentRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen && portalTarget) {
      document.body.classList.add('overflow-hidden');
    } else if (portalTarget) {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      if (portalTarget) {
        document.body.classList.remove('overflow-hidden');
      }
    };
  }, [isOpen, portalTarget]);

   useEffect(() => {
    const handleClickOutsideContent = (event) => {
      if (menuContentRef.current && !menuContentRef.current.contains(event.target)) {
        if (event.target === menuContentRef.current.parentNode) { 
            setIsOpen(false);
        }
      }
    };
    if (isOpen && portalTarget) {
      document.addEventListener('mousedown', handleClickOutsideContent);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideContent);
    };
  }, [isOpen, portalTarget, setIsOpen]);


  const menuItems = [
    ...(isLoggedIn ? [
      { label: currentUserEmail || 'Profile', icon: Palette, type: 'display', key: 'email' },
      { label: 'Logout', icon: LogOut, action: onLogoutClick, key: 'logout' },
    ] : [
      { label: 'Login', icon: LogIn, action: onLoginClick, key: 'login' },
      { label: 'Sign Up', icon: UserPlus, action: onSignupClick, key: 'signup' },
    ]),
    { type: 'divider', key: 'div_user_projects' },
    { label: 'My Projects', icon: Briefcase, action: () => navigateTo('projects'), key: 'projects' },
    { label: 'Roadmap Designer', icon: ClipboardList, action: () => navigateTo('roadmap-designer'), key: 'roadmap-designer' },
    { type: 'divider', key: 'div_roadmap_tools' },
    { label: 'Sprite Generator', icon: Palette, action: () => navigateTo('home'), key: 'generator' },
    { label: 'Item Generator', icon: Sword, action: () => navigateTo('item-generator'), key: 'item-generator' },
    { label: 'Map Concept Generator', icon: Map, action: () => navigateTo('map-generator'), key: 'map-generator' },
    { label: 'Story Concept Generator', icon: BookText, action: () => navigateTo('story-generator'), key: 'story-generator' },
    { label: 'RPG System Generator', icon: ScrollText, action: () => navigateTo('rpg-system-generator'), key: 'rpg-system-generator' },
    { type: 'divider', key: 'div_tools_utils' },
    { label: 'My Assets', icon: LayoutGrid, action: () => navigateTo('assets'), key: 'assets' },
    { label: 'Interactive Playground', icon: BoxSelect, action: () => navigateTo('playground'), key: 'playground' },
    { type: 'divider', key: 'div_nav_legal' },
    { label: `Legal (${appName})`, icon: FileText, action: onLegalClick, key: 'legal' },
    { label: `Terms of Service (${appName})`, icon: Shield, action: onTosClick, key: 'tos' },
  ];

  const finalMenuItems = menuItems.reduce((acc, item, index, arr) => {
    if (item.type === 'divider') {
      if (acc.length > 0 && acc[acc.length - 1].type !== 'divider') {
        const hasActualItemAfter = arr.slice(index + 1).some(i => i.type !== 'divider');
        if (hasActualItemAfter) {
          acc.push(item);
        }
      }
    } else {
      acc.push(item);
    }
    return acc;
  }, []);

  const menuModalContent = isOpen && portalTarget ? (
    <div
      id="full-screen-menu"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-fade-in-down"
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-screen-menu-title"
    >
      <div ref={menuContentRef} className="w-full max-w-lg bg-black rounded-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-[var(--accent-gold)]">
          <h2 id="full-screen-menu-title" className="font-display text-2xl text-[var(--accent-gold)]">{appName} Menu</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full text-[var(--accent-gold)] hover:opacity-80 transition-opacity"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto max-h-[70vh]">
          {finalMenuItems.map(item => {
            if (item.type === 'divider') {
              return <hr key={item.key} className="my-2 border-[var(--accent-gold)] opacity-30" />;
            }
            
            const baseItemClasses = "w-full text-left flex items-center px-6 py-5 text-base font-medium transition-colors border-b border-[var(--accent-gold)]/50 last:border-b-0";

            if (item.type === 'display') {
              return (
                <div key={item.key} className={`${baseItemClasses} text-[var(--text-primary)] font-semibold truncate`}>
                  <item.icon size={22} className="inline mr-4 text-[var(--accent-gold)] flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            }
            return (
              <button
                key={item.key}
                onClick={() => { if (item.action) item.action(); setIsOpen(false); }}
                className={`${baseItemClasses} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}
              >
                <item.icon size={22} className="mr-4 text-[var(--accent-gold)] flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  ) : null;

  return portalTarget ? ReactDOM.createPortal(menuModalContent, portalTarget) : null;
};


const Header = ({ appName = "SpriteForge", navigateTo, ...props }) => { 
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="header-style">
      <div className="w-full flex flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
        <button onClick={() => navigateTo('roadmap-designer')} className="flex items-center gap-2 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-md">
          <Palette size={28} strokeWidth={2} className="text-[var(--accent-gold)] group-hover:text-[var(--accent-gold-hover)] transition-colors" /> 
          <span className="font-display text-[var(--accent-gold)] group-hover:text-[var(--accent-gold-hover)] font-bold text-3xl sm:text-4xl tracking-tighter uppercase transition-colors">
            {appName}
          </span>
        </button>
        
        <button
            id="hamburger-menu-trigger"
            type="button"
            onClick={() => setUserMenuOpen(true)}
            className="p-2 rounded-full text-[var(--accent-gold)] hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            aria-label="Open menu"
            aria-expanded={userMenuOpen}
            aria-controls="full-screen-menu"
        >
            <Menu size={28} strokeWidth={1.5} />
        </button>

        <UserMenuModal 
            isOpen={userMenuOpen} 
            setIsOpen={setUserMenuOpen}
            appName={appName}
            navigateTo={navigateTo} 
            {...props} 
        />
      </div>
    </header>
  );
};

export default Header;