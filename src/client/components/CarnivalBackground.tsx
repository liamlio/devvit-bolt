import React from 'react';

interface CarnivalBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const CarnivalBackground: React.FC<CarnivalBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Striped carnival background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              #3b82f6 0px,
              #3b82f6 20px,
              #60a5fa 20px,
              #60a5fa 40px
            )
          `
        }}
      />
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};