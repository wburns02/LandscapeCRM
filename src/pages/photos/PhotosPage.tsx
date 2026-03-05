import { Camera, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PhotoGrid from '../../components/ui/PhotoGrid';

export default function PhotosPage() {
  const { photos } = useData();
  const toast = useToast();

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
        <PhotoGrid photos={photos} />
      )}
    </div>
  );
}
