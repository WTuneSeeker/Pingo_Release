import * as Icons from 'lucide-react';

export default function AvatarDisplay({ iconName = 'User', bgColor = 'bg-orange-500', size = 40 }) {
  // Pak het juiste icoon uit de Lucide bibliotheek
  const IconComponent = Icons[iconName] || Icons.User;
  
  // Bereken icon grootte (ongeveer de helft van de cirkel)
  const iconSize = Math.round(size * 0.55);

  return (
    <div 
      className={`${bgColor} rounded-full flex items-center justify-center shadow-sm shrink-0 border-2 border-white/20`}
      style={{ width: size, height: size }}
    >
      <IconComponent size={iconSize} className="text-white" strokeWidth={2.5} />
    </div>
  );
}