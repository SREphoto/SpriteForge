
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';

const LoginModal = ({ isOpen, onClose, onLogin, appName = "SpriteForge" }) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    // Mock login: any non-empty email/password works
    onLogin(email); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} role="button" tabIndex={-1} />
      <div className="card-style relative max-w-md w-full z-10 transition-all duration-300 ease-in-out transform scale-95 data-[open]:scale-100 opacity-0 data-[open]:opacity-100 !p-6 sm:!p-8" data-open={isOpen ? '' : undefined}>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 id="login-modal-title" className="font-display text-2xl text-[var(--text-primary)] flex items-center">
            <LogIn size={28} className="mr-3 text-[var(--accent-gold)]" /> Login to {appName}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" aria-label="Close login dialog">
            <X size={22} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email Address</label>
            <input 
              type="email" 
              id="login-email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="form-input" 
              placeholder="you@example.com" 
              required 
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
            <input 
              type="password" 
              id="login-password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="form-input" 
              placeholder="••••••••" 
              required 
            />
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400 pt-1">{error}</p>}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="button-secondary !px-6 !py-2.5 order-2 sm:order-1">
              Cancel
            </button>
            <button type="submit" className="button-primary !px-8 !py-2.5 order-1 sm:order-2">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;