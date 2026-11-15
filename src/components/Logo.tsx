import { Shield, Heart } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
  className?: string;
}

export default function Logo({
  size = 'md',
  variant = 'default',
  showText = true,
  className = '',
}: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-4xl' },
  };

  const colors = {
    default: {
      bg: 'from-emerald-500 to-teal-600',
      text: 'from-emerald-700 to-teal-700',
      icon: 'text-white',
    },
    white: {
      bg: 'from-white to-gray-100',
      text: 'from-white to-gray-200',
      icon: 'text-emerald-600',
    },
    dark: {
      bg: 'from-gray-800 to-gray-900',
      text: 'from-gray-700 to-gray-800',
      icon: 'text-emerald-400',
    },
  };

  const currentSize = sizes[size];
  const currentColor = colors[variant];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentColor.bg} rounded-2xl blur-lg opacity-50`}
        ></div>

        {/* Main logo container */}
        <div className={`relative bg-gradient-to-br ${currentColor.bg} p-3 rounded-2xl shadow-2xl`}>
          <Shield
            className={`${currentColor.icon}`}
            style={{ width: currentSize.icon, height: currentSize.icon }}
            strokeWidth={2.5}
          />
        </div>

        {/* Heart accent */}
        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-red-400 to-pink-500 p-1.5 rounded-full shadow-lg">
          <Heart
            className="text-white fill-white"
            style={{ width: currentSize.icon * 0.4, height: currentSize.icon * 0.4 }}
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`${currentSize.text} font-bold bg-gradient-to-r ${currentColor.text} bg-clip-text text-transparent`}
          >
            TikaTrack
          </span>
          <span className="text-xs text-neutral-500 font-medium">টিকাট্র্যাক</span>
        </div>
      )}
    </div>
  );
}
