import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Photo } from '../../types';

interface PhotoGridProps {
  photos: Photo[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(idx)}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-earth-800 hover:border-green-500/50 transition-colors"
          >
            <img
              src={photo.thumbnail_url || photo.url}
              alt={photo.caption || 'Photo'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {photo.type && (
              <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded capitalize">
                {photo.type}
              </span>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(i => (i ?? 0) - 1)}
              className="absolute left-4 p-2 text-white/70 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(i => (i ?? 0) + 1)}
              className="absolute right-4 p-2 text-white/70 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={photos[lightboxIndex].url}
            alt={photos[lightboxIndex].caption || 'Photo'}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
          {photos[lightboxIndex].caption && (
            <p className="absolute bottom-6 text-white text-sm bg-black/50 px-4 py-2 rounded">
              {photos[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
