import React from "react";
import { Button as AstryxButton } from "@astryxdesign/core/Button";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, variant = "primary", ...props }: ButtonProps) {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95";
  
  const variantStyle = variant === "primary" 
    ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20" 
    : "bg-slate-100 text-slate-900 hover:bg-slate-200";

  return (
    <AstryxButton className={`${baseStyle} ${variantStyle}`} {...props}>
      {children}
    </AstryxButton>
  );
}

