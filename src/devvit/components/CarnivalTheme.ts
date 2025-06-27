export const CarnivalTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#93c5fd',
    accent: '#FFD700',
    success: '#32CD32',
    danger: '#FF4444',
    warning: '#FFA500',
    background: '#F0F8FF',
    shadow: '#C0C0C0',
    text: '#000000',
    textLight: '#666666',
    white: '#FFFFFF',
  },
};

// Create the carnival striped background
export const createCarnivalBackground = () => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="56.57" height="56.57" patternTransform="rotate(45)">
          <rect width="28.28" height="56.57" fill="#3b82f6"/>
          <rect x="28.28" width="28.28" height="56.57" fill="#93c5fd"/>
        </pattern>
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0.2"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#diagonalStripes)" opacity="0.9"/>
      <rect width="100%" height="100%" fill="white" filter="url(#noiseFilter)" opacity="0.2"/>
    </svg>
  `)}`;
};