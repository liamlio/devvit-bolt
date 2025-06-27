import React from 'react';

export const CarnivalBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Carnival tent stripes background */}
      <div 
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              #3b82f6 0px,
              #3b82f6 40px,
              #93c5fd 40px,
              #93c5fd 80px
            )
          `,
          filter: 'contrast(1.1) brightness(0.95)',
        }}
      />
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-20"
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