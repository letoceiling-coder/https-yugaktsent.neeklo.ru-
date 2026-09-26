import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  label?: string;
};

const MissingPhotoPlaceholder = ({ className, label = 'Фото отсутствует' }: Props) => (
  <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground', className)}>
    <Home className="h-8 w-8" aria-hidden="true" />
    <span className="text-xs font-medium">{label}</span>
  </div>
);

export default MissingPhotoPlaceholder;
