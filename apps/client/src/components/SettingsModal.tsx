import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSandbox: () => void;
}

type Tab = 'THEME' | 'AUDIO' | 'SANDBOX' | 'DEBUGGING';

export default function SettingsModal({ isOpen, onClose, onOpenSandbox }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('THEME');
  const { isDark, toggleTheme } = useTheme();

  const tabs: Tab[] = ['THEME', 'AUDIO', 'SANDBOX', 'DEBUGGING'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-300'} border rounded-2xl max-w-sm w-full mx-4 p-0 overflow-hidden flex flex-col`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Tabs */}
            <div className={`relative border-b flex flex-row pt-2 px-2 ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
              <button
                onClick={onClose}
                className={`absolute top-3 right-3 leading-none p-1 ${isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700'}`}
                aria-label="Close settings"
              >
                ✕
              </button>
              
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-amber-400 text-amber-400 font-bold'
                      : `border-b-2 border-transparent ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700'}`
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-4 min-h-[200px]">
              {activeTab === 'THEME' && (
                <div className="flex flex-row gap-3">
                  {/* Dark Card */}
                  <div
                    onClick={() => !isDark && toggleTheme()}
                    className={`flex-1 rounded-xl p-3 border-2 cursor-pointer transition-colors ${
                      isDark
                        ? 'border-amber-400 bg-amber-900/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-12 w-full rounded-lg bg-zinc-950 mb-2 flex items-center justify-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    </div>
                    <div className={`text-xs font-black text-center ${isDark ? 'text-zinc-200' : 'text-slate-500'}`}>DARK</div>
                  </div>

                  {/* Light Card */}
                  <div
                    onClick={() => isDark && toggleTheme()}
                    className={`flex-1 rounded-xl p-3 border-2 cursor-pointer transition-colors ${
                      !isDark
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="h-12 w-full rounded-lg bg-slate-100 mb-2 flex items-center justify-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    </div>
                    <div className={`text-xs font-black text-center ${!isDark ? 'text-slate-700' : 'text-zinc-400'}`}>LIGHT</div>
                  </div>
                </div>
              )}

              {activeTab === 'AUDIO' && (
                <div className="h-full flex items-center justify-center pt-8">
                  <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Audio settings — coming soon</span>
                </div>
              )}

              {activeTab === 'SANDBOX' && (
                <div className="flex flex-col items-start">
                  <div className="font-black text-amber-400 mb-2">⚗ SANDBOX MODE</div>
                  <div className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Test new features and patches. Load a .json patch file to enable
                    experimental tiles, bombs, or scoring changes. RTP simulation included.
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSandbox();
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-black px-6 py-2 rounded-xl mt-4 transition-colors"
                  >
                    OPEN SANDBOX
                  </button>
                  <div className={`text-xs mt-4 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                    ⚠ Sandbox changes are session-local and do not affect saved scores.
                  </div>
                </div>
              )}
              {activeTab === 'DEBUGGING' && (
                <div className="flex flex-col items-start gap-4">
                  <div className="font-black text-rose-500 mb-2">🛠 DEBUGGING</div>
                  <div className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Developer tools. Use with caution.
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => console.log('Debug: Force Farkle')}
                      className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/50 font-bold px-4 py-2 rounded-lg transition-colors text-left"
                    >
                      Force Farkle
                    </button>
                    <button
                      onClick={() => console.log('Debug: Add 1000 Bank')}
                      className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/50 font-bold px-4 py-2 rounded-lg transition-colors text-left"
                    >
                      Add 1000 to Bank
                    </button>
                    <button
                      onClick={() => console.log('Debug: Spawn Rainbow Bomb')}
                      className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/50 font-bold px-4 py-2 rounded-lg transition-colors text-left"
                    >
                      Spawn Rainbow Bomb
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
