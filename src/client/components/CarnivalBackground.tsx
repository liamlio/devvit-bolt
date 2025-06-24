import React from 'react';

interface CarnivalBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const CarnivalBackground: React.FC<CarnivalBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Main carnival gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, 
              #ff6b6b 0%, 
              #4ecdc4 25%, 
              #45b7d1 50%, 
              #96ceb4 75%, 
              #ffeaa7 100%
            )
          `
        }}
      />
      
      {/* Striped carnival overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              transparent 0px,
              transparent 10px,
              rgba(255, 255, 255, 0.1) 10px,
              rgba(255, 255, 255, 0.1) 20px
            )
          `
        }}
      />
      
      {/* Animated floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🎪</div>
        <div className="absolute top-20 right-20 text-3xl animate-bounce" style={{ animationDelay: '1s' }}>🎭</div>
        <div className="absolute bottom-20 left-20 text-3xl animate-bounce" style={{ animationDelay: '2s' }}>🎨</div>
        <div className="absolute bottom-10 right-10 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>🎯</div>
        <div className="absolute top-1/2 left-5 text-2xl animate-bounce" style={{ animationDelay: '1.5s' }}>🎈</div>
        <div className="absolute top-1/3 right-5 text-2xl animate-bounce" style={{ animationDelay: '2.5s' }}>🎊</div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};