import * as React from "react"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ 
  src, 
  alt = '', 
  fallback, 
  size = 'md',
  className,
  ...props 
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleError = () => {
    setImgError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayFallback = fallback || (alt ? getInitials(alt) : '?');

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold overflow-hidden border-2",
        sizeClasses[size],
        className
      )}
      style={{
        background: '#068294',
        color: '#ffffff',
        borderColor: '#2A6E85',
        ...(props.style || {})
      }}
      {...props}
    >
      {src && !imgError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-slate-700 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt}
            onError={handleError}
            onLoad={handleLoad}
            className={cn(
              "h-full w-full object-cover rounded-full",
              isLoading && "opacity-0"
            )}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          {displayFallback ? (
            <span>{displayFallback}</span>
          ) : (
            <User className="h-1/2 w-1/2" style={{ color: '#ffffff' }} />
          )}
        </div>
      )}
    </div>
  );
}
