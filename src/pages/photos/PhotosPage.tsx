import { useState } from 'react';
import { Camera, Upload, Trees, Flower2, Shovel, Sun, ImagePlus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
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
  const { photos, jobs } = useData();
  const toast = useToast();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadJobId, setUploadJobId] = useState('');
  const [uploadType, setUploadType] = useState<Photo['type']>('before');
  const [uploadCaption, setUploadCaption] = useState('');

  const allPhotos = [...photos, ...localPhotos];

  const filteredPhotos = activeFilter === 'All'
    ? allPhotos
    : allPhotos.filter(p => p.type === activeFilter.toLowerCase());

  const jobOptions = jobs.map(j => ({ value: j.id, label: j.title }));
  const typeOptions: { value: Photo['type']; label: string }[] = [
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'progress', label: 'Progress' },
  ];

  function openUploadModal() {
    setUploadJobId('');
    setUploadType('before');
    setUploadCaption('');
    setDragOver(false);
    setUploadOpen(true);
  }

  function handleSavePhoto() {
    const selectedJob = jobs.find(j => j.id === uploadJobId);
    const newPhoto: Photo = {
      id: `local-${Date.now()}`,
      url: '',
      caption: uploadCaption || 'Uploaded photo',
      type: uploadType,
      job_id: uploadJobId || undefined,
      job_name: selectedJob?.title,
      uploaded_by: 'Demo User',
      created_at: new Date().toISOString(),
    };
    setLocalPhotos(prev => [newPhoto, ...prev]);
    setUploadOpen(false);
    toast.success('Photo added successfully');
  }

  return (
    <div className="space-y-6">
      {/* Upload Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Photo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePhoto}>Save Photo</Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-green-500 bg-green-500/10'
                : 'border-earth-600 bg-earth-800/30 hover:border-earth-500'
            }`}
          >
            <ImagePlus className="w-10 h-10 text-earth-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-earth-200">Drag & drop a photo here</p>
              <p className="text-xs text-earth-500 mt-1">or click to browse (demo mode)</p>
            </div>
          </div>

          <Select
            label="Job"
            placeholder="Select a job (optional)"
            options={jobOptions}
            value={uploadJobId}
            onChange={(e) => setUploadJobId(e.target.value)}
          />

          <Select
            label="Type"
            options={typeOptions}
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as Photo['type'])}
          />

          <Input
            label="Caption"
            placeholder="Describe this photo..."
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
          />
        </div>
      </Modal>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Photos</h2>
          <p className="text-sm text-earth-400">{allPhotos.length} photos</p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} onClick={openUploadModal}>Upload Photos</Button>
      </div>

      {allPhotos.length === 0 ? (
        <EmptyState
          icon={<Camera className="w-10 h-10" />}
          title="No photos yet"
          description="Upload before and after photos from your jobs to build a portfolio and show customers your work."
          actionLabel="Upload Photos"
          onAction={openUploadModal}
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
