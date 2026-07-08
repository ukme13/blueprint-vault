import { Button } from "@blueprint/ui";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Designally Starter Vault</h1>
      
      {/* ทดสอบเรียกใช้ปุ่มเวอร์ชันหน้าบ้าน (Primary Orange) */}
      <Button variant="primary">
        Next.js Front-end Button
      </Button>

      {/* ทดสอบเรียกใช้ปุ่มเวอร์ชันหลังบ้าน (Secondary Slate) */}
      <Button variant="secondary">
        Admin Dashboard Button
      </Button>
    </div>
  );
}