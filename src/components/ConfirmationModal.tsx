import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Check, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isSubmitting?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  isSubmitting = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3",
                variant === 'danger' ? "bg-red-50 text-red-600 shadow-red-100" :
                variant === 'warning' ? "bg-amber-50 text-amber-600 shadow-amber-100" :
                "bg-indigo-50 text-indigo-600 shadow-indigo-100"
              )}>
                <AlertCircle className="w-8 h-8" />
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className={cn(
                  "flex-[1.5] py-4 text-sm font-bold text-white rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50",
                  variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200" :
                  variant === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" :
                  "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                )}
              >
                {isSubmitting ? (
                  <ArrowRight className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {confirmLabel}
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
