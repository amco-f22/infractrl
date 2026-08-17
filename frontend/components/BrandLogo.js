"use client";

export function BrandLogo({ className = "", iconOnly = false, size = "md" }) {
  const heights = {
    sm: "h-6",
    md: "h-8 sm:h-9",
    lg: "h-11 sm:h-12",
  };

  const currentHeight = heights[size] || "h-8 sm:h-9";

  if (iconOnly) {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.png"
          alt="InfraCtrl"
          className={`${currentHeight} w-auto object-contain transition-transform duration-200 hover:scale-105 select-none`}
        />
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="InfraCtrl"
        className={`${currentHeight} w-auto object-contain transition-transform duration-200 hover:scale-105 select-none`}
      />
    </div>
  );
}

export default BrandLogo;
