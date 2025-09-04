/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ErrorModal = ({ isOpen, onClose, title = "An Error Occurred", message = "Something went wrong. Please try again." }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
      <div
        className="absolute inset-0 modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={-1}
      />

      <div className="card-style relative max-w-md w-full z-10 transition-all duration-300 ease-in-out transform scale-95 data-[open]:scale-100 opacity-0 data-[open]:opacity-100 !p-6 sm:!p-8" data-open={isOpen ? '' : undefined}>
        <div className="flex items-start">
            <div className="mr-5 flex-shrink-0 mt-1">
                <AlertTriangle size={32} className="text-red-500 dark:text-red-400" />
            </div>
            <div className="flex-1">
                <h2 id="error-modal-title" className="font-display text-2xl text-[var(--text-primary)] mb-2.5">
                {title}
                </h2>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                {message}
                </p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                aria-label="Close error dialog"
            >
                <X size={22} />
            </button>
        </div>
        
        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="button-secondary !px-6 !py-2.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;