import React from 'react';

interface ClueIconProps {
  className?: string;
}

const ClueIcon: React.FC<ClueIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15H10v-1h4v1zm0-2H10v-1h4v1zm1.31-4.91l-.79.54V14h-5.04v-3.37l-.79-.54A4.98 4.98 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.62-.78 3.13-2.08 4.09h-.61z" />
    <path d="M10 20h4c.55 0 1 .45 1 1s-.45 1-1 1h-4c-.55 0-1-.45-1-1s.45-1 1-1z" />
  </svg>
);

export default ClueIcon;
