
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, Shield } from 'lucide-react';

const TosModal = ({ isOpen, onClose, appName = "SpriteForge" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tos-modal-title">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} role="button" tabIndex={-1} />
      <div className="card-style relative max-w-lg w-full z-10 transition-all duration-300 ease-in-out transform scale-95 data-[open]:scale-100 opacity-0 data-[open]:opacity-100 !p-6 sm:!p-8" data-open={isOpen ? '' : undefined}>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 id="tos-modal-title" className="font-display text-2xl text-[var(--text-primary)] flex items-center">
            <Shield size={28} className="mr-3 text-[var(--accent-gold)]" /> Terms of Service ({appName})
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" aria-label="Close Terms of Service dialog">
            <X size={22} />
          </button>
        </div>
        
         <div className="prose-modals max-h-[60vh] overflow-y-auto pr-2">
          <p>Welcome to {appName}! These are placeholder Terms of Service.</p>
          
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using {appName}, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.</p>

          <h3>2. Service Description</h3>
          <p>{appName} provides users with tools to generate sprite designs and character art using artificial intelligence based on uploaded reference images/art styles and textual descriptions. Some features, such as generating multiple design sets or higher resolution sprites, may be part of premium subscription tiers.</p>

          <h3>3. User Accounts</h3>
          <p>To access certain features, you may need to create an account. You are responsible for safeguarding your password and for any activities or actions under your password. (Note: Current implementation is a mock login.)</p>

          <h3>4. User Conduct and Responsibilities</h3>
          <p>You agree not to use the service to:</p>
          <ul>
            <li>Upload or generate any content (reference images, prompts, or sprites) that is unlawful, harmful, defamatory, infringing, or otherwise objectionable.</li>
            <li>Violate any applicable local, state, national, or international law.</li>
            <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others. This includes generating sprites that are direct copies or derivatives of existing copyrighted characters or artwork without proper authorization.</li>
          </ul>
           <p>You are solely responsible for the reference images/styles you upload and the sprites you generate. Ensure you have all necessary rights and permissions for the assets you use and create, especially if intended for commercial use.</p>

          <h3>5. Subscription Features</h3>
          <p>Access to certain enhanced features, such as generating a higher number of design sets, advanced customization options, or higher resolution sprites, may require an active subscription. Details of subscription plans, including pricing and features, will be provided at the point of purchase.</p>
          
          <h3>6. Disclaimer of Warranties</h3>
          <p>The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the reliability, accuracy, or completeness of the service or the generated sprite content. Generated sprites may require further editing or refinement for final use.</p>
          
          <h3>7. Limitation of Liability</h3>
          <p>In no event shall {appName} or its developers be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service, or any issues arising from the use of generated sprites in your projects.</p>

          <h3>8. Changes to Terms</h3>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this site.</p>
          
          <p><em>This is a placeholder document and not legally binding. Consult a legal professional for actual Terms of Service, particularly concerning intellectual property and use of AI-generated assets in game development or other commercial contexts.</em></p>
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="button-secondary !px-6 !py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TosModal;