import React from 'react';
import { clsx } from 'clsx';

interface CarnivalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const CarnivalButton: React.FC<CarnivalButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const baseClasses = 'font-bold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-800',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-gray-800',
    success: 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-800',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && disabledClasses,
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-white opacity-20 rounded-md"></div>
        <div className="relative z-10">{children}</div>
      </div>
    </button>
  );
};