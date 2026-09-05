import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, AlertCircle, CheckCircle2, X, ShieldAlert, ShieldCheck, Delete } from 'lucide-react';
import { triggerHapticFeedback } from '../../utils/printService';

export const DEVELOPER_PIN = '1111';
export const DEV_SESSION_STORAGE_KEY = 'kegama_developer_mode_unlocked';

interface DeveloperPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeveloperPinModal: React.FC<DeveloperPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setIsSuccess(false);
      setIsShaking(false);
    }
  }, [isOpen]);

  const handleVerify = useCallback(
    (codeToTest: string) => {
      if (lockoutRemaining > 0 || isSuccess) return;

      if (codeToTest === DEVELOPER_PIN) {
        triggerHapticFeedback();
        setIsSuccess(true);
        setErrorMsg(null);
        sessionStorage.setItem(DEV_SESSION_STORAGE_KEY, 'true');
        setTimeout(() => {
          onSuccess();
        }, 350);
      } else {
        triggerHapticFeedback();
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setIsShaking(true);

        if (newAttempts >= 5) {
          setLockoutRemaining(30);
          setErrorMsg('Too many failed attempts. Console locked for 30 seconds.');
        } else {
          const remaining = 5 - newAttempts;
          setErrorMsg(`Incorrect security PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        }

        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 500);
      }
    },
    [failedAttempts, isSuccess, lockoutRemaining, onSuccess]
  );

  const addDigit = useCallback(
    (digit: string) => {
      if (lockoutRemaining > 0 || isSuccess) return;
      triggerHapticFeedback();
      setErrorMsg(null);

      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          setTimeout(() => handleVerify(next), 50);
        }
        return next;
      });
    },
    [handleVerify, isSuccess, lockoutRemaining]
  );

  const removeDigit = useCallback(() => {
    if (lockoutRemaining > 0 || isSuccess) return;
    triggerHapticFeedback();
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isSuccess, lockoutRemaining]);

  const clearPin = useCallback(() => {
    if (lockoutRemaining > 0 || isSuccess) return;
    triggerHapticFeedback();
    setErrorMsg(null);
    setPin('');
  }, [isSuccess, lockoutRemaining]);

  // Handle Physical Keyboard Navigation (Desktop/Laptop)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        removeDigit();
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        clearPin();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 4);
      if (pasted) {
        e.preventDefault();
        setPin(pasted);
        if (pasted.length === 4) {
          setTimeout(() => handleVerify(pasted), 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, addDigit, removeDigit, clearPin, handleVerify, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-200 ${
          isShaking ? 'animate-shake' : ''
        }`}
        style={{
          animation: isShaking ? 'pinShake 0.4s ease-in-out' : undefined,
        }}
      >
        <style>{`
          @keyframes pinShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Developer Authorization
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Kegama Hotel Systems • Secure Console
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Administrative PIN Verification
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Enter your 4-digit security PIN to unlock the centralized database, cryptographic keystores, and system telemetry.
            </p>
          </div>

          {/* 4-Digit Indicator Display Boxes */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pin.length;
              const isActive = index === pin.length && !isSuccess && !errorMsg;

              return (
                <div
                  key={index}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 shadow-xs ${
                    isSuccess
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30'
                      : errorMsg
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/30'
                      : isFilled
                      ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 ring-2 ring-orange-500/25 scale-105'
                      : isActive
                      ? 'border-orange-400 dark:border-orange-500 ring-2 ring-orange-500/20 bg-white dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                  }`}
                >
                  {isFilled ? (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-orange-600 dark:bg-orange-500 shadow-xs" />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 animate-ping" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Status / Error Alerts */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Access Granted! Opening Developer Console...</span>
            </div>
          )}

          {errorMsg && !isSuccess && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-semibold leading-tight">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {lockoutRemaining > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-2 text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Security Cooldown: {lockoutRemaining}s remaining</span>
            </div>
          )}

          {/* Touch / Virtual Numeric Keypad for Mobile & Tablet */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 select-none">
            {[
              { num: '1', letters: '' },
              { num: '2', letters: 'ABC' },
              { num: '3', letters: 'DEF' },
              { num: '4', letters: 'GHI' },
              { num: '5', letters: 'JKL' },
              { num: '6', letters: 'MNO' },
              { num: '7', letters: 'PQRS' },
              { num: '8', letters: 'TUV' },
              { num: '9', letters: 'WXYZ' },
            ].map((item) => (
              <button
                key={item.num}
                type="button"
                disabled={lockoutRemaining > 0 || isSuccess}
                onClick={() => addDigit(item.num)}
                className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-orange-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-900 dark:text-slate-100 transition active:scale-95 disabled:opacity-40 shadow-xs flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700"
              >
                <span className="font-black text-lg sm:text-xl leading-none font-mono">{item.num}</span>
                {item.letters && (
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider mt-0.5">
                    {item.letters}
                  </span>
                )}
              </button>
            ))}

            <button
              type="button"
              disabled={lockoutRemaining > 0 || isSuccess || pin.length === 0}
              onClick={clearPin}
              className="h-12 sm:h-14 rounded-2xl bg-slate-100/80 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 transition active:scale-95 disabled:opacity-40 flex items-center justify-center border border-slate-200 dark:border-slate-700"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={lockoutRemaining > 0 || isSuccess}
              onClick={() => addDigit('0')}
              className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-orange-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 transition active:scale-95 disabled:opacity-40 shadow-xs flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 font-mono"
            >
              <span className="leading-none">0</span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider mt-0.5">+</span>
            </button>

            <button
              type="button"
              disabled={lockoutRemaining > 0 || isSuccess || pin.length === 0}
              onClick={removeDigit}
              className="h-12 sm:h-14 rounded-2xl bg-slate-100/80 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition active:scale-95 disabled:opacity-40 flex items-center justify-center border border-slate-200 dark:border-slate-700"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Secure Production Authorization Notice */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              Authorized Access Only
            </span>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
