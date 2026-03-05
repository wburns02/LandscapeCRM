import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export default function SlidePanel({ isOpen, onClose, title, children, width = 'md' }: SlidePanelProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handler);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handler);
      };
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          'fixed top-0 right-0 h-full bg-earth-900 border-l border-earth-700 z-50 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          {
            'w-full max-w-sm': width === 'sm',
            'w-full max-w-lg': width === 'md',
            'w-full max-w-2xl': width === 'lg',
          }
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800">
          <h2 className="text-lg font-semibold font-display text-earth-50">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
}
