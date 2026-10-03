import Image from "next/image";
import type { CSSProperties } from "react";

type ARGroupLogoProps = {
  className?: string;
  variant?: "mark" | "full";
};

const goldTitleStyle: CSSProperties = {
  background: "linear-gradient(180deg, #e8c547 0%, #c9a227 38%, #9a7b1a 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export function ARGroupLogo({ className = "h-11 w-11", variant = "mark" }: ARGroupLogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/ar_group_logo_mark.png"
        alt="Falcon Swift PVT. LTD."
        width={44}
        height={44}
        quality={100}
        unoptimized
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        className={`object-contain ${className}`}
        priority
      />
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="h-[68%] w-full min-h-0 flex items-end justify-center">
        <Image
          src="/ar_group_logo_mark.png"
          alt=""
          width={64}
          height={64}
          quality={100}
          unoptimized
          aria-hidden
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          className="h-full w-auto max-w-full object-contain object-bottom"
          priority
        />
      </div>
      <div className="h-[32%] w-full min-h-0 flex flex-col items-center justify-center text-center px-0.5 leading-none">
        <p
          className="font-bold uppercase tracking-[0.16em] whitespace-nowrap text-[10px] sm:text-[11px]"
          style={goldTitleStyle}
        >
          Falcon Swift PVT. LTD. of Companies
        </p>
        <p
          className="uppercase tracking-[0.2em] text-[#6b5d4f] font-medium whitespace-nowrap mt-[0.35em] text-[7px] sm:text-[8px]"
        >
          Empowering Leading-Edge Success
        </p>
      </div>
    </div>
  );
}
