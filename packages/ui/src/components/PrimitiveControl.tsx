'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Selector } from '@astryxdesign/core/Selector';
import { Slider } from '@astryxdesign/core/Slider';

// ==========================================================================
// 🧮 COLOR SPACE MATH ENGINE (HEX <-> RGB <-> OKLCH)
// ==========================================================================
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const f = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = f(r), lg = f(g), lb = f(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073972615 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720403 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(a * a + b_ * b_);
  let H = Math.atan2(b_, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToHex(L: number, C: number, H: number): string {
  const rH = H * (Math.PI / 180);
  const a = C * Math.cos(rH);
  const b_ = C * Math.sin(rH);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b_;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const toSRGB = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  r = Math.max(0, Math.min(1, toSRGB(r)));
  g = Math.max(0, Math.min(1, toSRGB(g)));
  b = Math.max(0, Math.min(1, toSRGB(b)));
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ==========================================================================
// STABLE 25-INTERVAL NAMING ENGINE (De-duplication & Collision Prevention)
// ==========================================================================
function generateStableWeights(numShades: number): number[] {
  // Linear interpolation from 50 to 950
  const raw: number[] = [];
  for (let i = 0; i < numShades; i++) {
    const t = numShades === 1 ? 0 : i / (numShades - 1);
    const rawWeight = 50 + (950 - 50) * t;
    raw.push(rawWeight);
  }

  // Round to nearest multiple of 25
  let weights = raw.map(w => Math.round(w / 25) * 25);

  // De-duplication loop: resolve collisions by forcing ascending unique values
  for (let i = 1; i < weights.length; i++) {
    if (weights[i]! <= weights[i - 1]!) {
      weights[i] = weights[i - 1]! + 25;
    }
  }

  // Clamp final step at 950 and adjust backward if needed
  if (weights[weights.length - 1]! > 950) {
    weights[weights.length - 1] = 950;
    // Adjust backward to maintain ascending order
    for (let i = weights.length - 2; i >= 0; i--) {
      if (weights[i]! >= weights[i + 1]!) {
        weights[i] = Math.max(50, weights[i + 1]! - 25);
      }
    }
  }

  return weights;
}

// ==========================================================================
// EASING FUNCTIONS FOR LIGHTNESS DISTRIBUTION
// ==========================================================================
type DistributionMode = 'linear' | 'ease-in-out' | 'ease-in' | 'ease-out' | 'custom';

function easeInOut(t: number): number {
  return (1 - Math.cos(t * Math.PI)) / 2;
}

function easeIn(t: number): number {
  return t * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function applyEasing(t: number, mode: DistributionMode): number {
  switch (mode) {
    case 'ease-in-out':
      return easeInOut(t);
    case 'ease-in':
      return easeIn(t);
    case 'ease-out':
      return easeOut(t);
    case 'linear':
    case 'custom':
    default:
      return t;
  }
}

function generateLightnessArray(
  numShades: number,
  maxL: number,
  minL: number,
  mode: DistributionMode
): number[] {
  const array: number[] = [];
  for (let i = 0; i < numShades; i++) {
    const t = numShades === 1 ? 0 : i / (numShades - 1);
    const eased = applyEasing(t, mode);
    const lightness = maxL - (maxL - minL) * eased;
    array.push(lightness);
  }
  return array;
}

// ==========================================================================
// CONFIGS & INTERFACES
// ==========================================================================
interface ShadeItem {
  weight: number;
  L: number;
  C: number;
  H: number;
  hex: string;
  isAnchor: boolean;
  isOverridden: boolean;
}

interface ColorTrack {
  id: string;
  name: string;
  seedHex: string;
  shades: ShadeItem[];
}

export function PrimitiveControl() {
  // --- 🎨 STATE: Global palette configuration ---
  const [numShades, setNumShades] = useState<number>(15);
  const [distMode, setDistMode] = useState<DistributionMode>('linear');
  const [maxL, setMaxL] = useState<number>(96);
  const [minL, setMinL] = useState<number>(6);
  const [lightnessArray, setLightnessArray] = useState<number[]>([]);
  
  const [tracks, setTracks] = useState<ColorTrack[]>([
    { id: '1', name: 'primary', seedHex: '#7646ab', shades: [] },
    { id: '2', name: 'secondary', seedHex: '#008080', shades: [] },
    { id: '3', name: 'danger', seedHex: '#b02b1b', shades: [] }
  ]);

  const [activeEdit, setActiveEdit] = useState<{ trackId: string; weight: number } | null>(null);

  // --- ⚡ Sync lightnessArray when distMode or numShades/maxL/minL changes (except 'custom')
  useEffect(() => {
    if (distMode !== 'custom') {
      const newArray = generateLightnessArray(numShades, maxL, minL, distMode);
      setLightnessArray(newArray);
    }
  }, [numShades, distMode, maxL, minL]);

  // --- Initialize lightnessArray on first mount
  useEffect(() => {
    if (lightnessArray.length === 0) {
      setLightnessArray(generateLightnessArray(numShades, maxL, minL, distMode));
    }
  }, []);

  const handleLightnessChange = useCallback((index: number, value: number) => {
    setLightnessArray(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    // Switch to custom mode when manually adjusting
    setDistMode('custom');
  }, []);

  const addTrack = () => {
    const randomColors = ['#e67e22', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6'] as const;
    const randomHex = randomColors[Math.floor(Math.random() * randomColors.length)]!;
    setTracks([...tracks, {
      id: Date.now().toString(),
      name: `custom-${tracks.length + 1}`,
      seedHex: randomHex,
      shades: []
    }]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length <= 1) return alert("Must keep at least 1 palette");
    setTracks(tracks.filter(t => t.id !== id));
    if (activeEdit?.trackId === id) setActiveEdit(null);
  };

  const updateTrackProp = (id: string, key: 'name' | 'seedHex', value: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id === id) {
        return key === 'name' 
          ? { ...t, name: value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() }
          : { ...t, seedHex: value, shades: [] };
      }
      return t;
    }));
  };

  // --- 🧮 ENGINE: Advanced Palette Generation with Auto-Docking ---
  const computedPalettes = useMemo(() => {
    const weights = generateStableWeights(numShades);
    
    return tracks.map(track => {
      const [r, g, b] = hexToRgb(track.seedHex);
      const [sL, sC, sH] = rgbToOklch(r, g, b);
      const seedLightnessPercent = sL * 100;

      // 🎯 Auto-Docking: Find closest lightness index by perceptual distance
      let closestIdx = 0;
      let minDiff = Infinity;
      lightnessArray.forEach((l, idx) => {
        const diff = Math.abs(l - seedLightnessPercent);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      const shades: ShadeItem[] = weights.map((weight, idx) => {
        const isAnchor = idx === closestIdx;
        const targetL = lightnessArray[idx]! / 100;

        // 1. Anchor: Lock to exact seed color OKLCH
        if (isAnchor) {
          return {
            weight,
            L: sL,
            C: sC,
            H: sH,
            hex: track.seedHex,
            isAnchor: true,
            isOverridden: false
          };
        }

        // 2. Interpolate Chroma with smart fading
        let C = sC;
        if (idx < closestIdx) {
          // Light zone: fade saturation towards lighter end (0.01)
          const factor = closestIdx > 0 ? idx / closestIdx : 0;
          C = 0.01 + factor * (sC - 0.01);
        } else {
          // Dark zone: gradually taper saturation (avoid muddiness)
          const denom = weights.length - 1 - closestIdx;
          const factor = denom > 0 ? (idx - closestIdx) / denom : 0;
          C = sC - factor * (sC - 0.025);
        }

        return {
          weight,
          L: targetL,
          C,
          H: sH,
          hex: oklchToHex(targetL, C, sH),
          isAnchor: false,
          isOverridden: false
        };
      });

      return { ...track, shades };
    });
  }, [tracks, numShades, lightnessArray]);

  // --- ⚡ INJECTION: CSS variable injection with stable naming ---
  useEffect(() => {
    const root = document.documentElement;
    computedPalettes.forEach(p => {
      p.shades.forEach(s => {
        if (p.name) {
          root.style.setProperty(
            `--color-${p.name}-${s.weight}`, 
            `oklch(${s.L.toFixed(3)} ${s.C.toFixed(3)} ${s.H.toFixed(1)})`
          );
        }
      });
    });
  }, [computedPalettes]);

  const exportAllToClipboard = () => {
    let css = `/* 🎨 OKLCH Color System - Stable 25-Interval Tokens */\n\n`;
    computedPalettes.forEach(p => {
      css += `/* Palette: ${p.name.toUpperCase()} */\n`;
      p.shades.forEach(s => {
        css += `--color-${p.name}-${s.weight}: oklch(${s.L.toFixed(3)} ${s.C.toFixed(3)} ${s.H.toFixed(1)}); /* ${s.hex} */\n`;
      });
      css += `\n`;
    });
    navigator.clipboard.writeText(css);
    alert('CSS tokens copied to clipboard!');
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl max-w-full mx-auto overflow-hidden font-sans">
      
      {/* 🚀 Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-8 py-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> OKLCH Palette Generator
            </h2>
            <p className="text-xs font-medium text-neutral-400">
              Stable 25-interval token naming • Easing curves • Auto-docking anchor • Zero token drift
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addTrack} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg">
              ＋ Add Palette
            </button>
            <button onClick={exportAllToClipboard} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg">
              💾 Export CSS
            </button>
          </div>
        </div>

        {/* Global Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-neutral-700 pt-4">
          <Slider
            label="Shade Steps"
            value={numShades}
            onChange={setNumShades}
            min={11}
            max={21}
            step={1}
            valueDisplay="text"
          />

          <Selector
            label="Distribution"
            value={distMode}
            onChange={(v: string) => setDistMode(v as DistributionMode)}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'ease-in-out', label: 'Ease In-Out' },
              { value: 'ease-in', label: 'Ease In' },
              { value: 'ease-out', label: 'Ease Out' },
              { value: 'custom', label: 'Custom' },
            ]}
          />

          <Slider
            label="Max L"
            value={maxL}
            onChange={setMaxL}
            min={70}
            max={100}
            step={1}
            valueDisplay="text"
            formatValue={(v: number) => `${v}%`}
          />

          <Slider
            label="Min L"
            value={minL}
            onChange={setMinL}
            min={2}
            max={30}
            step={1}
            valueDisplay="text"
            formatValue={(v: number) => `${v}%`}
          />
        </div>

        {/* Lightness Array Editor */}
        {distMode === 'custom' && lightnessArray.length > 0 && (
          <div className="border-t border-neutral-700 pt-4">
            <p className="text-xs font-bold text-neutral-400 mb-3">Fine-tune Individual Lightness Values</p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numShades}, minmax(0, 1fr))`, gap: '0.25rem' }}>
              {lightnessArray.map((l, idx) => (
                <div key={idx} className="space-y-1">
                  <Slider
                    label={`Lightness ${idx}`}
                    isLabelHidden
                    orientation="vertical"
                    min={0}
                    max={100}
                    step={1}
                    value={l}
                    onChange={(v: number) => handleLightnessChange(idx, v)}
                    valueDisplay="none"
                    style={{ height: 80 }}
                  />
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-bold text-neutral-300">{Math.round(l)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📋 Color Palette Matrix */}
      <div className="p-8 space-y-6">
        {computedPalettes.map((palette) => (
          <div key={palette.id} className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-sm space-y-4">
            
            {/* Track Properties */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="flex flex-col space-y-1 flex-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Track Name</span>
                  <input 
                    type="text" 
                    value={palette.name}
                    onChange={(e) => updateTrackProp(palette.id, 'name', e.target.value)}
                    className="text-sm font-black text-white bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 focus:bg-neutral-750 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Seed Color</span>
                  <div className="flex items-center gap-2 bg-neutral-800 px-2.5 py-1.5 rounded-xl border border-neutral-700">
                    <input type="color" value={palette.seedHex} onChange={(e) => updateTrackProp(palette.id, 'seedHex', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" />
                    <span className="text-xs font-mono font-bold text-neutral-300">{palette.seedHex}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeTrack(palette.id)} className="text-neutral-500 hover:text-red-500 transition-colors p-2 text-xs font-bold">🗑️ Delete</button>
            </div>

            {/* 🌈 Dynamic Color Scale Grid with Responsive Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numShades}, minmax(0, 1fr))`, gap: '0.5rem' }}>
              {palette.shades.map((shade) => {
                const isSelected = activeEdit?.trackId === palette.id && activeEdit?.weight === shade.weight;
                return (
                  <div 
                    key={shade.weight}
                    onClick={() => setActiveEdit(isSelected ? null : { trackId: palette.id, weight: shade.weight })}
                    className={`p-1.5 bg-neutral-800 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                      shade.isAnchor ? 'ring-2 ring-orange-500 border-orange-500 shadow-lg shadow-orange-500/20 -translate-y-0.5' : 
                      isSelected ? 'border-emerald-400 ring-1 ring-emerald-400 bg-neutral-750' : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg border border-black/20 relative shadow-inner" style={{ backgroundColor: shade.hex }}>
                      {shade.isAnchor && <span className="absolute bottom-1 right-1 text-[8px] bg-orange-500 text-white px-1 rounded shadow-sm">⚓</span>}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-neutral-200 font-mono">{shade.weight}</div>
                      <div className="text-[8px] font-mono text-neutral-500 uppercase truncate tracking-tighter">{shade.hex}</div>
                      <div className="text-[8px] font-mono text-neutral-600">L:{(shade.L * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}