import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Logo({ size = 'default', className = '', showText = true }) {
  const navigate = useNavigate();
  
  // Adjusted sizes for the logo to ensure it's visible even if it's vertically stacked
  const sizes = {
    small: 'h-14',
    default: 'h-20',
    large: 'h-32',
    xl: 'h-40'
  };

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity ${className}`} 
      onClick={() => navigate('/')}
    >
      <img 
        src="/logo.png" 
        alt="Cognify Logo" 
        className={`${sizes[size]} object-contain`}
        onError={(e) => {
          // Fallback if the user hasn't saved the image to public/logo.png yet
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
             e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
      
      {/* CSS Fallback if image is missing */}
      <div className="hidden flex-col justify-center">
         <span className="font-black tracking-widest text-white leading-none" style={{ fontSize: size === 'large' ? '3rem' : '1.5rem' }}>
           COGNIFY
         </span>
         {showText && (
           <span className="font-bold tracking-[0.25em] text-[#00c8b6] leading-none mt-1 uppercase" style={{ fontSize: size === 'large' ? '0.9rem' : '0.5rem' }}>
             Start Mastering
           </span>
         )}
      </div>
    </div>
  );
}
