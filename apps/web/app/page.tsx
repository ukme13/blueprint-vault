'use client';

import { PrimitiveControl } from '@blueprint/ui';
import { Button } from "@blueprint/ui";

export default function Page() {
  return (
    <main className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4 md:p-10 space-y-8 font-sans antialiased">
      
      {/* 🗺️ Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="text-2xl">🎨</span> OKLCH Design System Lab
          </h1>
          <p className="text-sm font-medium text-neutral-400">
            Real-time palette generator with stable 25-interval token naming • Auto-docking anchors • Zero token drift
          </p>
        </div>
      </div>

      {/* 🏗️ Workspace Grid: Studio + Live Preview */}
      <div className="max-w-7xl mx-auto grid xl:grid-cols-3 gap-8 items-start">
        
        {/* 🛠️ LEFT PANEL: Palette Studio & Generator */}
        <div className="xl:col-span-2">
          <PrimitiveControl />
        </div>

        {/* 📱 RIGHT PANEL: Live Component Preview */}
        <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 shadow-2xl space-y-6 sticky top-6">
          
          {/* Panel Header */}
          <div className="border-b border-neutral-800 pb-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Live Component Preview</h3>
            <p className="text-[11px] text-neutral-400 mt-1">
              Dynamic token mapping with guaranteed 50 ↔ 950 boundaries + cascading fallbacks
            </p>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* COMPONENT 1: Primary Feature Card */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
              Component 1: Primary Feature Card
            </span>
            <div 
              style={{ 
                backgroundColor: 'var(--color-primary-50, #f8f6fb)',
                borderColor: 'var(--color-primary-100, var(--color-primary-50, #f8f6fb))'
              }} 
              className="p-5 rounded-2xl border-2 space-y-3 transition-all duration-300"
            >
              <div>
                <h4 
                  style={{ color: 'var(--color-primary-950, #2a1547)' }}
                  className="text-sm font-black tracking-tight"
                >
                  Dashboard Feature Module
                </h4>
                <p 
                  style={{ color: 'var(--color-primary-700, var(--color-primary-600, #7646ab))' }}
                  className="text-xs mt-2 leading-relaxed font-medium"
                >
                  This card uses guaranteed token boundaries: light background (50) and dark text (950) with safe intermediate fallbacks for optimal contrast.
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  style={{ 
                    backgroundColor: 'var(--color-primary-600, var(--color-primary-700, #7646ab))',
                    color: 'white'
                  }}
                  className="text-[11px] font-bold px-3 py-2 rounded-lg shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
                >
                  Primary Action
                </button>
                <button 
                  style={{ 
                    backgroundColor: 'var(--color-primary-100, var(--color-primary-50, #f8f6fb))',
                    color: 'var(--color-primary-800, var(--color-primary-700, #7646ab))'
                  }}
                  className="text-[11px] font-bold px-3 py-2 rounded-lg hover:opacity-80 active:scale-95 transition-all border border-current"
                >
                  Secondary
                </button>
              </div>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* COMPONENT 2: Secondary Status Indicator */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
              Component 2: Status Engine
            </span>
            <div 
              style={{ 
                backgroundColor: 'var(--color-secondary-50, #e0f2f1)',
                borderColor: 'var(--color-secondary-100, var(--color-secondary-50, #e0f2f1))'
              }}
              className="flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                {/* Animated Status Indicator */}
                <div className="relative">
                  <span 
                    style={{ backgroundColor: 'var(--color-secondary-500, var(--color-secondary-600, #008080))' }}
                    className="h-3 w-3 rounded-full shadow-md shadow-cyan-500/50 block animate-pulse"
                  />
                </div>
                <span 
                  style={{ color: 'var(--color-secondary-800, var(--color-secondary-700, #004d40))' }}
                  className="text-xs font-bold"
                >
                  System Engine Running
                </span>
              </div>
              <span 
                style={{ 
                  backgroundColor: 'var(--color-secondary-100, var(--color-secondary-50, #e0f2f1))',
                  color: 'var(--color-secondary-700, var(--color-secondary-800, #004d40))'
                }} 
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-current"
              >
                ACTIVE
              </span>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* COMPONENT 3: Destructive Alert Box */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
              Component 3: Destructive Feedback
            </span>
            <div 
              style={{ 
                backgroundColor: 'var(--color-danger-50, #f9ebe8)',
                borderTopColor: 'var(--color-danger-200, var(--color-danger-100, #f7d5cf))',
                borderRightColor: 'var(--color-danger-200, var(--color-danger-100, #f7d5cf))',
                borderBottomColor: 'var(--color-danger-200, var(--color-danger-100, #f7d5cf))',
                borderLeftColor: 'var(--color-danger-600, var(--color-danger-700, #b02b1b))'
              }}
              className="p-4 rounded-2xl border-l-4 flex gap-3 transition-all duration-300"
            >
              <span className="text-lg shrink-0">⚠️</span>
              <div className="space-y-1 min-w-0">
                <h5 
                  style={{ color: 'var(--color-danger-900, var(--color-danger-800, #821e12))' }}
                  className="text-xs font-black"
                >
                  Production Alert
                </h5>
                <p 
                  style={{ color: 'var(--color-danger-700, var(--color-danger-600, #b02b1b))' }}
                  className="text-[11px] font-medium leading-snug"
                >
                  The palette auto-recalculates danger shades around the anchor point whenever you adjust the main lightness slider.
                </p>
              </div>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ARCHITECTURE NOTES */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="bg-neutral-800/50 border border-neutral-700 p-4 rounded-2xl text-[10px] font-medium leading-relaxed space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🏗️</span> Token Safety Architecture
            </div>
            <ul className="space-y-1 text-neutral-300 list-disc list-inside">
              <li>Guaranteed boundaries: <code className="text-white font-mono text-[9px]">--color-*-50</code> (lightest) & <code className="text-white font-mono text-[9px]">--color-*-950</code> (darkest)</li>
              <li>Cascading fallbacks: <code className="text-white font-mono text-[9px]">var(--color-primary-600, var(--color-primary-50, #fallback))</code></li>
              <li>Dynamic steps (11-21) don't break intermediate tokens—fallbacks ensure robustness</li>
              <li>All token names divisible by 25, no duplicates, ascending order guaranteed</li>
            </ul>
          </div>

        </div>

      </div>
    </main>
  );
}