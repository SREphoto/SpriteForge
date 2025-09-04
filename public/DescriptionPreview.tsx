
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';

// Combined interface for flexibility, though Home.tsx will pass the sprite version
interface DescriptionJson {
  iconConcept?: string; // Kept for potential backward compatibility or other uses
  spriteConcept?: string;
  styleAnalysis: {
    notes: string;
  };
  variants?: {
    default: { prompt: string };
    hover: { prompt: string };
    active: { prompt: string };
  };
}

interface DescriptionPreviewProps {
  description: DescriptionJson | null;
  type?: 'icon' | 'sprite'; // To slightly adjust terminology if needed
}

const markdownRendererComponents: Components = {
  h1: ({node, ...props}) => <h3 className="font-display text-lg font-semibold my-2 text-[var(--text-primary)]" {...props} />,
  h2: ({node, ...props}) => <h4 className="font-display text-md font-semibold my-2 text-[var(--text-primary)]" {...props} />,
  h3: ({node, ...props}) => <h5 className="font-display text font-semibold my-1 text-[var(--text-primary)]" {...props} />,
  p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-sm text-[var(--text-secondary)]" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 text-sm text-[var(--text-secondary)]" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 text-sm text-[var(--text-secondary)]" {...props} />,
  li: ({node, ...props}) => <li className="mb-1 text-sm text-[var(--text-secondary)]" {...props} />,
  code: ({ node, inline, className, children, ...props }: React.PropsWithChildren<CodeProps>) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <pre className={`${className} bg-[var(--bg-primary)] p-3 rounded text-xs overflow-x-auto border border-[var(--border-color)]`}>
        <code className={`language-${match[1]}`}>{children}</code>
      </pre>
    ) : (
      <code className={`${className || ''} bg-[var(--bg-secondary)] text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-xs`} {...props}>
        {children}
      </code>
    );
  },
  strong: ({node, ...props}) => <strong className="font-semibold text-[var(--text-primary)]" {...props} />,
  em: ({node, ...props}) => <em className="italic text-[var(--text-secondary)]" {...props} />,
  a: ({node, ...props}) => <a className="text-[var(--accent-gold)] hover:underline" {...props} />,
};


const DescriptionPreview: React.FC<DescriptionPreviewProps> = ({ description, type = 'icon' }) => {
  if (!description) {
    return null; 
  }

  const conceptLabel = type === 'sprite' ? 'Sprite Concept' : 'Icon Concept';
  const conceptValue = type === 'sprite' ? description.spriteConcept : description.iconConcept;

  const { styleAnalysis, variants } = description;

  return (
    <div>
      <h3 className="font-display text-2xl mb-3 text-[var(--text-primary)]">Description Details</h3>

      <div className="space-y-5">
        {conceptValue && (
          <div>
            <h4 className="font-display text-xl text-[var(--accent-gold)] mb-1.5">{conceptLabel}:</h4>
            <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <ReactMarkdown components={markdownRendererComponents} remarkPlugins={[remarkGfm]}>{conceptValue}</ReactMarkdown>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-display text-xl text-[var(--accent-gold)] mb-1.5">Style Analysis Notes:</h4>
           <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <ReactMarkdown components={markdownRendererComponents} remarkPlugins={[remarkGfm]}>{styleAnalysis.notes}</ReactMarkdown>
          </div>
        </div>

        {variants && (
          <div>
            <h4 className="font-display text-xl text-[var(--accent-gold)] mb-2.5">Variant Prompts:</h4>
            <div className="space-y-4">
              {(['default', 'hover', 'active'] as const).map((variantKey) => (
                variants[variantKey]?.prompt && (
                  <div key={variantKey}>
                    <h5 className="font-display text-lg text-[var(--accent-gold)] capitalize mb-1.5">{variantKey} State Prompt:</h5>
                    <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                       <ReactMarkdown components={markdownRendererComponents} remarkPlugins={[remarkGfm]}>{variants[variantKey].prompt}</ReactMarkdown>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DescriptionPreview;