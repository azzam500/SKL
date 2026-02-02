import React, { useState, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageModalProps {
  src: string;
  alt: string;
  className?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ src, alt, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Thumbnail Trigger */}
      <div 
        className={`relative group cursor-pointer overflow-hidden rounded-xl shadow-md ${className}`}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`View full size ${alt}`}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Overlay on hover with Icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 w-10 h-10 drop-shadow-lg" />
        </div>
      </div>

      {/* Full Screen Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
          >
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageModal;