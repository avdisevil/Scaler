import React from 'react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const colorPalette = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

export function Avatar({
  src,
  alt = 'User',
  size = 'md',
  isOnline,
  className = '',
}: AvatarProps) {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5 border-[1.5px]',
    sm: 'w-2 h-2 border-[1.5px]',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-3.5 h-3.5 border-2',
  };

  const initials = alt
    ? alt
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const bgColor = getAvatarColor(alt || 'User');

  return (
    <div className={`relative inline-flex shrink-0 ${sizeStyles[size]} ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="rounded-full object-cover w-full h-full shadow-inner"
        />
      ) : (
        <div
          className={`rounded-full ${bgColor} text-white flex items-center justify-center font-medium w-full h-full tracking-wider shadow-xs select-none`}
        >
          {initials || '?'}
        </div>
      )}

      {isOnline === true && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white bg-emerald-500 ${
            dotSizes[size]
          }`}
          title="Online"
        />
      )}
    </div>
  );
}
