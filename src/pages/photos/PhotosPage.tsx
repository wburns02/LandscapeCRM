import { useState } from 'react';
import { Camera, Upload, Trees, Flower2, Shovel, Sun } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import type { Photo } from '../../types';

const TYPE_BADGE_STYLES: Record<string, string> = {
  before: 'bg-amber-500/80 text-white',
  after: 'bg-green-500/80 text-white',
  progress: 'bg-sky-500/80 text-white',
  issue: 'bg-red-500/80 text-white',
  property: 'bg-earth-500/80 text-white',
};

const FILTER_OPTIONS = ['All', 'Before', 'After', 'Progress'] as const;

// Gradient backgrounds and icons for placeholder thumbnails
const PHOTO_PLACEHOLDERS: Record<string, { gradient: string; icon: typeof Trees }> = {
  before: { gradient: 'from-amber-800 to-amber-600', icon: Shovel },
  after: { gradient: 'from-green-800 to-green-500', icon: Trees },
  progress: { gradient: 'from-sky-800 to-sky-500', icon: Flower2 },
  property: { gradient: 'from-earth-700 to-earth-500', icon: Sun },
  issue: { gradient: 'from-red-800 to-red-500', icon: Camera },
};

function PhotoPlaceholder({ photo }: { photo: Photo }) {
  const config = PHOTO_PLACEHOLDERS[photo.type] || PHOTO_PLACEHOLDERS.property;
  const Icon = config.icon;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
      <Icon className="w-10 h-10 text-white/40" />
    </div>
  );
}

export default function PhotosPage() {
  const { photos } = useData();
  const toast = useToast();
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const filteredPhotos = activeFilter === 'All'
    ? photos
    : photos.filter(p => p.type === activeFilter.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Photos</h2>
          <p className="text-sm text-earth-400">{photos.length} photos</p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} onClick={() => toast.info('Photo upload coming soon')}>Upload Photos</Button>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera className="w-10 h-10" />}
          title="No photos yet"
          description="Upload before and after photos from your jobs to build a portfolio and show customers your work."
          actionLabel="Upload Photos"
          onAction={() => toast.info('Photo upload coming soon')}
        />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2">
            {FILTER_OPTIONS.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-green-600 text-white'
                    : 'bg-earth-800/50 text-earth-300 hover:bg-earth-800 hover:text-earth-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="rounded-xl border border-earth-800 bg-earth-900/40 overflow-hidden hover:border-green-500/40 transition-colors"
              >
                {/* Thumbnail placeholder */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <PhotoPlaceholder photo={photo} />
                  {/* Type badge */}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded capitalize ${TYPE_BADGE_STYLES[photo.type] || TYPE_BADGE_STYLES.property}`}>
                    {photo.type}
                  </span>
                </div>
                {/* Card info */}
                <div className="p-3 space-y-1.5">
                  <p className="text-sm text-earth-100 font-medium leading-snug line-clamp-2">
                    {photo.caption}
                  </p>
                  {photo.job_name && (
                    <p className="text-xs text-green-400 truncate">{photo.job_name}</p>
                  )}
                  <p className="text-xs text-earth-500">
                    {format(new Date(photo.created_at), 'MMM d, yyyy')}
                    {photo.uploaded_by && ` \u00b7 ${photo.uploaded_by}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredPhotos.length === 0 && (
            <p className="text-sm text-earth-400 text-center py-8">No {activeFilter.toLowerCase()} photos found.</p>
          )}
        </>
      )}
    </div>
  );
}
