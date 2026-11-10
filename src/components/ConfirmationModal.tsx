import React, { useEffect } from 'react';
import { type Language } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  language: Language;
  isDangerous?: boolean; // Acciones destructivas (rojo)
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Solo ESC cierra. Enter activa el botón que tenga el foco (Cancelar por defecto),
  // así nadie confirma una acción por accidente.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        ref={focusTrapRef}
        className="modal-enter w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <h3 id="confirmation-title" className="text-xl font-bold text-slate-900">
          {title}
        </h3>
        <p id="confirmation-message" className="mt-2 leading-relaxed text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            autoFocus
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-[48px] flex-1 rounded-xl px-4 py-3 font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isDangerous
                ? 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-700'
                : 'bg-primary hover:bg-primary-hover focus-visible:ring-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
