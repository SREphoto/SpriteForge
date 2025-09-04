
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Page, Project, SavedAsset, StoryConceptAsset } from './index';
import Header from './components/Header';
import ErrorModal from './components/ErrorModal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import LegalModal from './components/LegalModal';
import TosModal from './components/TosModal';
import { Briefcase, PlusCircle, Trash2, CheckCircle, Edit3, FolderOpen, AlertTriangle, X } from 'lucide-react';

interface ProjectsProps {
  navigateTo: (page: Page) => void;
  appName: string;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  isCreatingProject: { isCreating: boolean, newProjectName: string | null };
  setIsCreatingProject: React.Dispatch<React.SetStateAction<{ isCreating: boolean, newProjectName: string | null }>>;
  savedAssets: SavedAsset[]; // To find story concepts for display
}

export default function Projects({
  navigateTo,
  appName,
  projects,
  setProjects,
  activeProjectId,
  setActiveProjectId,
  isCreatingProject, // ensure this prop is destructured
  setIsCreatingProject,
  savedAssets,
}: ProjectsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

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

  const handleCreateNewProject = () => {
    if (!newProjectNameInput.trim()) {
      setErrorDetails({ title: "Project Name Required", message: "Please enter a name for your new project." });
      return;
    }
    setIsCreatingProject({ isCreating: true, newProjectName: newProjectNameInput.trim() });
    setShowCreateModal(false);
    setNewProjectNameInput('');
    navigateTo('story-generator'); // Navigate to story generator to create the initial story
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
    setProjectToDelete(null); // Close confirmation modal
  };
  
  const getStoryConceptTitle = (storyConceptId: string | null): string => {
    if (!storyConceptId) return "No story linked";
    const storyAsset = savedAssets.find(asset => asset.id === storyConceptId && asset.assetType === 'storyConcept') as StoryConceptAsset | undefined;
    return storyAsset?.name || "Story Concept (Not Found)";
  };

  const sortedProjects = [...projects].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] app-container-waves">
      <Header
        appName={appName}
        isLoggedIn={isLoggedIn}
        currentUserEmail={currentUserEmail}
        onLoginClick={() => setLoginModalOpen(true)}
        onSignupClick={() => setSignupModalOpen(true)}
        onLogoutClick={handleLogout}
        onLegalClick={() => setLegalModalOpen(true)}
        onTosClick={() => setTosModalOpen(true)}
        navigateTo={navigateTo}
      />

      <main className="flex-grow w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <section aria-labelledby="projects-title" className="mb-10">
          <h1 id="projects-title" className="h1-style text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gold)] via-[#FFD700] to-[var(--accent-gold)]">
            My Game Projects
          </h1>
          <p className="text-lg text-[var(--text-secondary)] text-center max-w-2xl mx-auto">
            Manage your game development projects. Each project links a core story to all related assets.
          </p>
        </section>

        <div className="mb-8 text-center">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="button-primary !px-8 !py-3 text-lg inline-flex items-center"
          >
            <PlusCircle size={22} className="mr-2.5" /> Create New Project
          </button>
        </div>

        {sortedProjects.length === 0 ? (
          <div className="card-style text-center py-12">
            <FolderOpen size={56} className="mx-auto text-[var(--accent-gold)] opacity-70 mb-6" />
            <h2 className="h2-style mb-3">No Projects Yet</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Start a new project to begin organizing your game ideas and assets.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedProjects.map(project => (
              <div key={project.id} className={`card-style p-5 transition-all duration-200 ease-in-out ${activeProjectId === project.id ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)] shadow-[var(--gold-glow-shadow)]' : 'border-[var(--border-color)]'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-grow">
                    <h2 className="h3-style !text-xl sm:!text-2xl mb-1 flex items-center">
                      <Briefcase size={22} className={`mr-2.5 ${activeProjectId === project.id ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`} />
                      {project.name}
                    </h2>
                    <p className="text-xs text-[var(--text-placeholder)] mb-1">
                      Created: {new Date(project.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-1" title={getStoryConceptTitle(project.storyConceptId)}>
                      Story: {getStoryConceptTitle(project.storyConceptId)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
                    <button
                      onClick={() => {
                        setActiveProjectId(project.id);
                        navigateTo('roadmap-designer'); // Or a project dashboard page in the future
                      }}
                      className={`button-secondary w-full sm:w-auto !text-sm !px-4 !py-2 flex items-center justify-center ${activeProjectId === project.id ? '!bg-[var(--accent-gold)] !text-[var(--accent-gold-text-on-gold)]' : ''}`}
                    >
                      {activeProjectId === project.id ? <CheckCircle size={16} className="mr-2" /> : <FolderOpen size={16} className="mr-2" />}
                      {activeProjectId === project.id ? 'Active Project' : 'Set Active & Open'}
                    </button>
                    <button
                      onClick={() => setProjectToDelete(project)}
                      className="button-tertiary !text-red-500 hover:!bg-red-500/10 w-full sm:w-auto !text-sm !px-3 !py-2 flex items-center justify-center"
                    >
                      <Trash2 size={16} className="mr-1.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
          <div className="card-style relative max-w-md w-full z-10 !p-6 sm:!p-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl text-[var(--text-primary)] flex items-center">
                    <Edit3 size={26} className="mr-3 text-[var(--accent-gold)]" /> Create New Project
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" aria-label="Close dialog">
                    <X size={20}/>
                </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Enter a name for your new project. You'll then be guided to create its core story concept.
            </p>
            <input
              type="text"
              value={newProjectNameInput}
              onChange={(e) => setNewProjectNameInput(e.target.value)}
              placeholder="My Awesome Game Project"
              className="form-input mb-5"
              aria-label="New project name"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="button-secondary">Cancel</button>
              <button onClick={handleCreateNewProject} className="button-primary">Next: Create Story</button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 modal-backdrop" onClick={() => setProjectToDelete(null)}></div>
            <div className="card-style relative max-w-md w-full z-10 !p-6 sm:!p-8">
                <div className="flex items-start">
                    <div className="mr-4 flex-shrink-0 mt-1">
                        <AlertTriangle size={30} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-display text-xl text-[var(--text-primary)] mb-2">Delete Project "{projectToDelete.name}"?</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-1">
                            Are you sure you want to delete this project?
                        </p>
                         <p className="text-xs text-[var(--text-placeholder)] mb-4">
                            This action will remove the project entry. Associated assets (sprites, items, etc.) will remain in your global "My Assets" library but will no longer be linked to this project. This cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                    <button onClick={() => setProjectToDelete(null)} className="button-secondary">Cancel</button>
                    <button onClick={() => handleDeleteProject(projectToDelete.id)} className="button-primary bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white">
                        Yes, Delete Project
                    </button>
                </div>
            </div>
        </div>
      )}


      <footer className="w-full text-center p-6 border-t border-[var(--border-color)] mt-12">
        <p className="text-sm text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} {appName}. My Game Projects.</p>
      </footer>

      <ErrorModal isOpen={!!errorDetails} onClose={() => setErrorDetails(null)} title={errorDetails?.title} message={errorDetails?.message} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLogin={handleLogin} appName={appName} />
      <SignupModal isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSignup={handleSignup} appName={appName} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} appName={appName} />
      <TosModal isOpen={tosModalOpen} onClose={() => setTosModalOpen(false)} appName={appName} />
    </div>
  );
}
