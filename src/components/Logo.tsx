import { GraduationCap } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { icon: 18, text: "text-base" },
    md: { icon: 22, text: "text-lg" },
    lg: { icon: 28, text: "text-2xl" },
  } as const;
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-hero)", width: s.icon + 14, height: s.icon + 14, boxShadow: "var(--shadow-soft)" }}
      >
        <GraduationCap size={s.icon} strokeWidth={2.2} />
      </div>
      <span className={`font-display font-semibold tracking-tight ${s.text}`}>
        Aprender<span className="text-primary">+</span>
      </span>
    </div>
  );
}
