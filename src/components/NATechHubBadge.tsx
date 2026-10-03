type NATechHubBadgeProps = {
  className?: string;
  variant?: "inline" | "footer";
};

export function NATechHubBadge({ className = "", variant = "footer" }: NATechHubBadgeProps) {
  if (variant === "footer") {
    return (
      <div className={`flex items-center justify-center gap-1.5 text-xs ${className}`}>
        <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400 font-medium">
          Developed by
        </span>
        <span className="text-xs font-bold tracking-tight text-stone-800">
          Falcon Swift PVT. LTD.
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col text-left ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Developed by</p>
      <p className="text-xs font-bold text-stone-800">Falcon Swift PVT. LTD.</p>
    </div>
  );
}
