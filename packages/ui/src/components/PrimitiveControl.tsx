'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
// INTERFACES & TYPES
// ==========================================================================
interface OverrideValues {
  L: number;
  C: number;
  H: number;
}

interface ColorTrack {
  id: string;
  name: string;      // ชื่อระบบสี เช่น 'primary', 'success'
  seedHex: string;   // สีต้นแบบช่อง Anchor
  overrides: Record<number, OverrideValues>; // บันทึกการแต่งแมนนวลรายช่อง (shadeId -> OKLCH)
}

interface ShadeItem {
  id: number;
  L: number;
  C: number;
  H: number;
  hex: string;
  isAnchor: boolean;
  isOverridden: boolean;
}

export function PrimitiveControl() {
  // --- 🌐 GLOBAL CONFIG STATES (ตัวควบคุมส่วนกลางร่วมกันทุกแถวสี) ---
  const [numShades, setNumShades] = useState(15);
  const [maxL, setMaxL] = useState(96);
  const [minL, setMinL] = useState(8);

  // --- 🎨 DYNAMIC COLOR TRACKS STATE (คลังจัดเก็บแถวสี เพิ่ม/ลบได้) ---
  const [tracks, setTracks] = useState<ColorTrack[]>([
    { id: '1', name: 'primary', seedHex: '#7646ab', overrides: {} },
    { id: '2', name: 'secondary', seedHex: '#008080', overrides: {} },
    { id: '3', name: 'danger', seedHex: '#b02b1b', overrides: {} }
  ]);

  // คลุมตัวเลือกว่าจุดไหนกำลังเปิด Inspector จูนค่าอยู่
  const [activeEdit, setActiveEdit] = useState<{ trackId: string; shadeId: number } | null>(null);

  // --- ➕ ฟังก์ชันเพิ่มแถวสีใหม่ ---
  const addTrack = () => {
    const randomColors = ['#e67e22', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#34495e'];
    const randomHex = randomColors[Math.floor(Math.random() * randomColors.length)];
    const nextNum = tracks.length + 1;

    if (!randomHex) {
      return;
    }

    setTracks(prevTracks => [...prevTracks, {
      id: Date.now().toString(),
      name: `custom-${nextNum}`,
      seedHex: randomHex,
      overrides: {}
    }]);
  };

  // --- 🗑️ ฟังก์ชันลบแถวสี ---
  const removeTrack = (id: string) => {
    if (tracks.length <= 1) {
      alert("ต้องมีเหลือแถวสีหลักไว้อย่างน้อย 1 แถวนะครับพี่!");
      return;
    }
    setTracks(tracks.filter(t => t.id !== id));
    if (activeEdit?.trackId === id) setActiveEdit(null);
  };

  // --- ✏️ ฟังก์ชันจัดการอัปเดตข้อมูลภายใน Track ---
  const updateTrackProp = (id: string, key: 'name' | 'seedHex', value: string) => {
    setTracks(prevTracks => prevTracks.map(track => {
      if (track.id === id) {
        if (key === 'name') {
          // ล้างอักขระพิเศษและเคาะช่องว่างออก เพื่อให้ชื่อไปแปลงเป็นคลาส CSS ได้ไม่พัง
          const cleanName = value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
          return { ...track, name: cleanName };
        }
        if (key === 'seedHex') {
          // ถ้าเปลี่ยนสีหลัก แนะนำให้ล้างประวัติ Custom Override เก่าของแถวนั้นออกด้วยเพื่อไม่ให้สีโดด
          return { ...track, seedHex: value, overrides: {} };
        }
      }
      return track;
    }));
  };

  // --- ✏️ ฟังก์ชันบันทึกค่า Manual Override รายช่อง ---
  const updateShadeOverride = (trackId: string, shadeId: number, key: keyof OverrideValues, value: number) => {
    setTracks(prevTracks => prevTracks.map(track => {
      if (track.id === trackId) {
        const currentOverride = track.overrides[shadeId] || {
          // ดึงค่าเบสไลน์ปัจจุบันมาตั้งต้นก่อนถ้ายังไม่เคยแต่งแมนนวล
          L: 0.5, C: 0.1, H: 0
        };
        
        // ค้นหาค่าเบสไลน์ดั้งเดิมของช่องนั้นเพื่อนำมาประยุกต์กรณีจุดเริ่มต้น
        return {
          ...track,
          overrides: {
            ...track.overrides,
            [shadeId]: { ...currentOverride, [key]: value }
          }
        };
      }
      return track;
    }));
  };

  // --- 🧮 ENGINE: คำนวณแจกแจงเมทริกซ์สีทั้งหมดตาม Global Config และ Track Params ---
  const computedPalettes = useMemo(() => {
    const targetMaxL = maxL / 100;
    const targetMinL = minL / 100;

    return tracks.map(track => {
      const [r, g, b] = hexToRgb(track.seedHex);
      const [sL, sC, sH] = rgbToOklch(r, g, b);

      // สร้างสเกลความสว่างพื้นฐานแบบเส้นตรง (Linear Base)
      const tempShades: Omit<ShadeItem, 'isAnchor' | 'isOverridden'>[] = [];
      for (let i = 0; i < numShades; i++) {
        const t = numShades > 1 ? i / (numShades - 1) : 0;
        const currentL = targetMaxL - t * (targetMaxL - targetMinL);
        tempShades.push({ id: i + 1, L: currentL, C: 0, H: sH, hex: '' });
      }

      // ตรวจสอบ Auto-Docking หาช่องล็อกความสว่างที่ใกล้เคียงที่สุด
      let closestIdx = 0;
      let minDifference = Infinity;
      tempShades.forEach((shade, idx) => {
        const diff = Math.abs(shade.L - sL);
        if (diff < minDifference) {
          minDifference = diff;
          closestIdx = idx;
        }
      });

      // จัดวางโครงสร้างเกลี่ยสี + ตรวจสอบเงื่อนไข Override แมนนวล
      const generatedShades: ShadeItem[] = tempShades.map((shade, idx) => {
        const hasOverride = track.overrides[shade.id] !== undefined;
        const isAnchor = idx === closestIdx;

        // 1. ถ้ามีคนกดปรับค่าแมนนวลไว้ ให้ดึงค่า Override มาใช้สูงสุด
        if (hasOverride) {
          const ov = track.overrides[shade.id];
          if (ov) {
            return {
              id: shade.id,
              L: ov.L,
              C: ov.C,
              H: ov.H,
              hex: oklchToHex(ov.L, ov.C, ov.H),
              isAnchor,
              isOverridden: true
            };
          }
        }

        // 2. ถ้าเป็นช่อง Anchor สแกนล็อกสีหลัก แปะค่าดิบแท้ลงไปตรงๆ
        if (isAnchor) {
          return { id: shade.id, L: sL, C: sC, H: sH, hex: track.seedHex, isAnchor: true, isOverridden: false };
        }

        // 3. ปรับเกลี่ยเฉดสีปกติแบบคณิตศาสตร์รอบตัวแบรนด์
        let C = sC;
        if (idx < closestIdx) {
          const factor = closestIdx > 0 ? idx / closestIdx : 0;
          C = 0.01 + factor * (sC - 0.01);
        } else {
          const denom = numShades - 1 - closestIdx;
          const factor = denom > 0 ? (idx - closestIdx) / denom : 0;
          C = sC - factor * (sC - 0.02);
        }

        return {
          id: shade.id,
          L: shade.L,
          C,
          H: sH,
          hex: oklchToHex(shade.L, C, sH),
          isAnchor: false,
          isOverridden: false
        };
      });

      return {
        ...track,
        shades: generatedShades
      };
    });
  }, [tracks, numShades, maxL, minL]);

  // --- ⚡ INJECTION ENGINE: ส่งกระจายค่าตัวแปรเข้าสู่ระบบ DOM Root ของเบราว์เซอร์ ---
  useEffect(() => {
    const root = document.documentElement;
    computedPalettes.forEach(palette => {
      palette.shades.forEach(shade => {
        // พ่นออกมาตามชื่อไดนามิกถอดรหัส: --color-primary-1, --color-secondary-12, เป็นต้น
        if (palette.name) {
          root.style.setProperty(
            `--color-${palette.name}-${shade.id}`,
            `oklch(${shade.L.toFixed(3)} ${shade.C.toFixed(3)} ${shade.H.toFixed(1)})`
          );
        }
      });
    });
  }, [computedPalettes]);

  // ฟังก์ชันกวาดส่งออกโค้ด CSS ยกแผงทั้งหมดทุกแถว
  const exportToClipboard = () => {
    let css = `/* ==========================================================================\n`;
    css += `   🎨 EXPORTED MULTI-PALETTE SYSTEM (${numShades} Steps GLOBAL SCALE)\n`;
    css += `   ========================================================================== */\n\n`;

    computedPalettes.forEach(p => {
      css += `/* Palette: ${p.name.toUpperCase()} */\n`;
      p.shades.forEach(s => {
        css += `--color-${p.name}-${s.id}: oklch(${s.L.toFixed(3)} ${s.C.toFixed(3)} ${s.H.toFixed(1)}); /* ${s.hex} */\n`;
      });
      css += `\n`;
    });

    navigator.clipboard.writeText(css);
    alert('คัดลอกโครงสร้างสีทุก Palette ทั้งหมดเข้า Clipboard เรียบร้อยแล้วครับพี่!');
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-3xl shadow-2xl max-w-7xl mx-auto overflow-hidden font-sans">
      
      {/* 🚀 บอร์ดควบคุมชั้นบนสุด (Header Panel) */}
      <div className="bg-white border-b border-neutral-200 px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-neutral-900" />
            <h2 className="text-xl font-black text-neutral-900 tracking-tight">Enterprise Palette Matrix</h2>
          </div>
          <p className="text-xs font-medium text-neutral-500">
            ระบบจัดสรรและผลิตเฉดสีส่วนกลางแบบหลายกลุ่มเครื่องยนต์ ควบคุมสเกลร่วมกันด้วยมาตรฐาน OKLCH
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addTrack}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>＋</span> Add Palette
          </button>
          <button 
            onClick={exportToClipboard} 
            className="bg-neutral-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-neutral-800 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>📥</span> Export All CSS
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* 🎛️ GLOBAL CONTROL ROOM (แผงตั้งค่าโครงสร้างสเกลหลักคุมทุกแถว) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          
          {/* ปรับสเกล Global */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Global Steps Scale</label>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{numShades} เฉดร่วมกัน</span>
            </div>
            <input 
              type="range" min="5" max="24" value={numShades} 
              onChange={(e) => setNumShades(Number(e.target.value))} 
              className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 mt-2" 
            />
          </div>

          {/* ปรับลิมิตเพดานความสว่าง */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Global Max Lightness</label>
              <span className="text-xs font-mono font-bold text-neutral-700">{maxL}%</span>
            </div>
            <input 
              type="range" min="75" max="100" value={maxL} 
              onChange={(e) => setMaxL(Number(e.target.value))} 
              className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 mt-2" 
            />
          </div>

          {/* ปรับลิมิตฐานความมืด */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Global Min Lightness</label>
              <span className="text-xs font-mono font-bold text-neutral-700">{minL}%</span>
            </div>
            <input 
              type="range" min="0" max="25" value={minL} 
              onChange={(e) => setMinL(Number(e.target.value))} 
              className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 mt-2" 
            />
          </div>

        </div>

        {/* 📋 LIST OF COLORS MATRIX WORKBENCH (รายการแถวสีทั้งหมด) */}
        <div className="space-y-6">
          {computedPalettes.map((palette) => (
            <div key={palette.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
              
              {/* แถบปรับค่าคุณสมบัติประจำแถว (Track Header Tool) */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  {/* ช่องพ่นแก้ชื่อกลุ่มสี */}
                  <div className="flex flex-col space-y-1 flex-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Token Name Name</span>
                    <input 
                      type="text" 
                      value={palette.name}
                      onChange={(e) => updateTrackProp(palette.id, 'name', e.target.value)}
                      placeholder="เช่น primary, accent"
                      className="text-sm font-black text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  {/* ตัวจิ้มสีหลักประจำแถว */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Seed Color</span>
                    <div className="flex items-center gap-2 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200">
                      <input 
                        type="color" 
                        value={palette.seedHex}
                        onChange={(e) => updateTrackProp(palette.id, 'seedHex', e.target.value)}
                        className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold text-neutral-700 uppercase">{palette.seedHex}</span>
                    </div>
                  </div>
                </div>

                {/* ปุ่มสั่งระเบิดลบแถวสีทิ้ง */}
                <button 
                  onClick={() => removeTrack(palette.id)}
                  className="text-neutral-400 hover:text-red-500 transition-colors p-2 text-xs font-bold flex items-center gap-1 mt-4"
                >
                  <span>🗑️</span> Delete
                </button>
              </div>

              {/* สเปกตรัมแสดงเฉดสีแบบ Fluid การันตีหน้ากระดานเส้นตรงเดียว */}
              <div 
                className="grid gap-1.5 w-full"
                style={{ gridTemplateColumns: `repeat(${numShades}, minmax(0, 1fr))` }}
              >
                {palette.shades.map((shade) => {
                  const isSelected = activeEdit?.trackId === palette.id && activeEdit?.shadeId === shade.id;
                  return (
                    <div 
                      key={shade.id}
                      onClick={() => {
                        // ดึงข้อมูลตัวแบนดั้งเดิมมาอัดใน Override State ถ้ายังไม่ได้ทำป้องกันค่ากระโดดตอนขยับสไลเดอร์ครั้งแรก
                        if (palette.overrides[shade.id] === undefined) {
                          updateShadeOverride(palette.id, shade.id, 'L', shade.L);
                          updateShadeOverride(palette.id, shade.id, 'C', shade.C);
                          updateShadeOverride(palette.id, shade.id, 'H', shade.H);
                        }
                        setActiveEdit(isSelected ? null : { trackId: palette.id, shadeId: shade.id });
                      }}
                      className={`group p-1 bg-white border rounded-lg cursor-pointer transition-all flex flex-col justify-between ${
                        shade.isAnchor ? 'ring-2 ring-neutral-950 border-neutral-950 shadow-md -translate-y-0.5' : 
                        shade.isOverridden ? 'border-amber-400 bg-amber-50/10' : 
                        isSelected ? 'border-neutral-900 ring-1 ring-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {/* บล็อกสี่เหลี่ยมสี */}
                      <div 
                        className="w-full aspect-square rounded-md shadow-inner border border-black/5 relative transition-transform group-hover:scale-[1.03]" 
                        style={{ backgroundColor: shade.hex }}
                      >
                        {shade.isAnchor && <span className="absolute bottom-0.5 right-0.5 text-[7px] bg-neutral-950 text-white font-black px-0.5 rounded scale-90">⚓</span>}
                        {shade.isOverridden && !shade.isAnchor && <span className="absolute bottom-0.5 right-0.5 text-[7px] bg-amber-500 text-white font-black px-0.5 rounded scale-90">✏️</span>}
                      </div>
                      
                      {/* ตัวอักษรดัชนีกำกับใต้กล่องสี */}
                      <div className="mt-1.5 text-center">
                        <div className="text-[9px] font-black text-neutral-800 font-mono">#{shade.id}</div>
                        <div className="text-[8px] font-mono text-neutral-400 group-hover:text-neutral-600 uppercase tracking-tighter truncate">{shade.hex}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

        {/* 🎛️ DETAILED INSPECTOR PANEL (แผงจูนแมนนวลแบบเจาะลึกแสดงผลใต้เมทริกซ์แถวคู่กรณี) */}
        {activeEdit !== null && (
          <div className="bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-2xl max-w-2xl mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
            {(() => {
              const currentTrack = computedPalettes.find(t => t.id === activeEdit.trackId);
              const currentShade = currentTrack?.shades.find(s => s.id === activeEdit.shadeId);
              if (!currentTrack || !currentShade) return null;
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  {/* พรีวิวฝั่งซ้าย */}
                  <div className="p-6 flex flex-col justify-between items-center text-center border-b sm:border-b-0 sm:border-r border-neutral-800 bg-black/20">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Track: {currentTrack.name}</span>
                      <h4 className="text-sm font-black text-neutral-200">เฉดสีลำดับที่ #{currentShade.id}</h4>
                    </div>
                    <div className="w-20 h-20 rounded-2xl shadow-xl border border-white/10 my-4" style={{ backgroundColor: currentShade.hex }} />
                    <div className="font-mono text-xs text-neutral-300">
                      <div className="font-black text-amber-400 text-sm uppercase">{currentShade.hex}</div>
                    </div>
                  </div>

                  {/* คอนโทรลสไลเดอร์ฝั่งขวา */}
                  <div className="p-6 sm:col-span-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                      <span className="text-xs font-bold text-neutral-400">Manual Jumper Overrides</span>
                      <button onClick={() => setActiveEdit(null)} className="text-[10px] font-bold text-neutral-400 hover:text-white px-2 py-0.5 bg-neutral-800 rounded-md">× Close</button>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* ปรับความสว่าง L */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-neutral-400">Lightness (L)</span>
                          <span className="text-amber-400 font-bold">{(currentShade.L * 100).toFixed(1)}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="0.1" value={currentShade.L * 100} onChange={(e) => updateShadeOverride(activeEdit.trackId, activeEdit.shadeId, 'L', Number(e.target.value) / 100)} className="w-full accent-amber-400 h-1 bg-neutral-800 appearance-none rounded" />
                      </div>

                      {/* ปรับความสด C */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-neutral-400">Chroma (C)</span>
                          <span className="text-amber-400 font-bold">{currentShade.C.toFixed(3)}</span>
                        </div>
                        <input type="range" min="0" max="0.37" step="0.002" value={currentShade.C} onChange={(e) => updateShadeOverride(activeEdit.trackId, activeEdit.shadeId, 'C', Number(e.target.value))} className="w-full accent-amber-400 h-1 bg-neutral-800 appearance-none rounded" />
                      </div>

                      {/* ปรับองศาเนื้อสี H */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-neutral-400">Hue (H)</span>
                          <span className="text-amber-400 font-bold">{Math.round(currentShade.H)}°</span>
                        </div>
                        <input type="range" min="0" max="360" step="1" value={currentShade.H} onChange={(e) => updateShadeOverride(activeEdit.trackId, activeEdit.shadeId, 'H', Number(e.target.value))} className="w-full accent-amber-400 h-1 bg-neutral-800 appearance-none rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
}