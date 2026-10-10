import React from 'react';

export function TeamBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-8 h-8 rounded-full" />;
  }
  
  const initials = name.substring(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
      {initials}
    </div>
  );
}
