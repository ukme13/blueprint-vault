import { PrimitiveControl } from "@blueprint/ui"; 
// 💡 โน้ต: อย่าลืมเปลี่ยน @blueprint/ui เป็นชื่อแถมแพ็กเกจ ui ในมอนอรีโปของพี่นะครับ

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-100 p-4 md:p-10 space-y-8 font-sans antialiased">
      
      {/* 🗺️ Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <span>🚀</span> Design System Engineering Workspace
          </h1>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">
            สถาปัตยกรรมทดสอบ Token 3 ชั้น: แมปค่าสีจากแล็บ OKLCH เข้าสู่ระบบ Component ด้วยสเกลแบบ Tailwind (50-950)
          </p>
        </div>
      </div>

      {/* 🏗️ Workspace Grid */}
      <div className="max-w-7xl mx-auto grid xl:grid-cols-3 gap-8 items-start">
        
        {/* 🛠️ ฝั่งซ้าย: เครื่องมือสตูดิโอ (กินพื้นที่ 2 ใน 3 ส่วน) */}
        <div className="xl:col-span-2">
          <PrimitiveControl />
        </div>

        {/* 📱 ฝั่งขวา: แผง Live Component Preview */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xl space-y-6 sticky top-6">
          
          <div className="border-b border-neutral-100 pb-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Dynamic Token Mapping</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              ทดสอบการดึงค่าจากชื่อแทร็กสี (primary, secondary, danger) ผ่านตัวแปรความสว่างสไตล์ Tailwind
            </p>
          </div>

          {/* 🟣 1. คลาสสิกการ์ดสีแบรนด์ (Primary Block) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">1. Primary Track Components</span>
            <div 
              style={{ 
                backgroundColor: 'var(--color-primary-50, #f8f6fb)', 
                borderColor: 'var(--color-primary-100, #e3d8f5)' 
              }} 
              className="p-5 rounded-2xl border text-left transition-all"
            >
              <h4 style={{ color: 'var(--color-primary-950, #56327e)' }} className="text-sm font-black">
                Interactive Dashboard Feature
              </h4>
              <p style={{ color: 'var(--color-primary-600, #7646ab)' }} className="text-xs mt-1.5 leading-relaxed font-medium">
                กล่องข้อความนี้ใช้สเกลความสว่างดั้งเดิม โดยดึงเฉด 50 มาทำพื้นหลังอ่อนนุ่ม และใช้เฉด 950 ทำเนื้อความเพื่อให้ได้ Contrast คมชัดอ่านง่าย
              </p>
              
              <div className="mt-4 flex gap-2">
                <button 
                  style={{ backgroundColor: 'var(--color-primary-600, #7646ab)' }}
                  className="text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-sm hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirm Action
                </button>
                <button 
                  style={{ 
                    backgroundColor: 'var(--color-primary-100, #e3d8f5)', 
                    color: 'var(--color-primary-800, #56327e)' 
                  }}
                  className="text-[11px] font-bold px-3 py-2 rounded-xl hover:opacity-80 active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          {/* 🟢 2. คอมโพเนนต์สีรอง (Secondary Track) */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">2. Secondary Track Components</span>
            <div className="flex items-center justify-between p-4 bg-neutral-25 rounded-2xl border border-neutral-200">
              <div className="flex items-center gap-3">
                {/* วงกลมไฟสถานะ ดึงเฉดสีหลัก 500/600 มาเรนเดอร์ */}
                <span 
                  style={{ backgroundColor: 'var(--color-secondary-500, #008080)' }} 
                  className="-translate-y-0.5 h-2.5 w-2.5 rounded-full shadow-sm animate-pulse" 
                />
                <span className="text-xs font-bold text-neutral-700">Secondary Status Engine</span>
              </div>
              <span 
                style={{ 
                  backgroundColor: 'var(--color-secondary-50, #e0f2f1)', 
                  color: 'var(--color-secondary-700, #004d40)' 
                }} 
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              >
                ONLINE
              </span>
            </div>
          </div>

          {/* 🔴 3. คอมโพเนนต์แจ้งเตือนอันตราย (Danger Track) */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">3. Destructive Feedbacks</span>
            <div 
              style={{ 
                backgroundColor: 'var(--color-danger-50, #f9ebe8)', 
                borderColor: 'var(--color-danger-100, #f7d5cf)' 
              }} 
              className="p-4 rounded-2xl border-l-4 border-l-(--color-danger-600,#b02b1b flex gap-3"
            >
              <span className="text-sm">⚠️</span>
              <div className="space-y-0.5">
                <h5 style={{ color: 'var(--color-danger-900, #821e12)' }} className="text-xs font-black">สายการผลิตเกิด Error</h5>
                <p style={{ color: 'var(--color-danger-600, #b02b1b)' }} className="text-[11px] font-medium leading-tight">
                  ระบบจะคำนวณเฉดสีแดงรอบจุด Anchor อัตโนมัติเมื่อมีการขยับสไลเดอร์หลัก
                </p>
              </div>
            </div>
          </div>

          {/* 💡 สรุปความเข้าใจ */}
          <div className="bg-neutral-900 text-neutral-400 p-4 rounded-2xl text-[10px] font-medium leading-relaxed space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1">
              <span>🧠</span> ARCHITECT REMINDER:
            </div>
            <p>
              ตอนนี้เมื่อพี่ลบหรือเพิ่มแถวสีใหม่ แล้วตั้งชื่อ Track ในบอร์ดควบคุม ตัวแปรฝั่งพรีวิวจะผูกสิทธิ์เข้าหากันทันทีผ่านคลาสถาวร เช่น <code className="text-white font-mono">--color-{"{ชื่อแทร็ก}"}-600</code> คลีน สบายตา ไร้ที่ติครับ!
            </p>
          </div>

        </div>

      </div>
      
    </main>
  );
}