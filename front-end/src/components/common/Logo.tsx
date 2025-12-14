import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const logoSize = sizeMap[size];

  return (
    <img
      src="/KinmeetLogo.png"
      alt="KinMeet"
      className={`${logoSize} rounded-full object-cover ${className}`}
    />
  );
};

export default Logo;

