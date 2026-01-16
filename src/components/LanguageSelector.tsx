import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

// Flag components using SVG
const FlagBrazil = () => (
  <svg viewBox="0 0 512 512" className="w-6 h-4 rounded-sm shadow-sm">
    <rect width="512" height="512" fill="#009739"/>
    <polygon points="256,64 492,256 256,448 20,256" fill="#FEDD00"/>
    <circle cx="256" cy="256" r="96" fill="#002776"/>
    <path d="M160,256 Q256,200 352,256" stroke="white" strokeWidth="16" fill="none"/>
  </svg>
);

const FlagUSA = () => (
  <svg viewBox="0 0 190 100" className="w-6 h-4 rounded-sm shadow-sm">
    <rect width="190" height="100" fill="#bf0a30"/>
    <rect y="7.69" width="190" height="7.69" fill="#fff"/>
    <rect y="23.08" width="190" height="7.69" fill="#fff"/>
    <rect y="38.46" width="190" height="7.69" fill="#fff"/>
    <rect y="53.85" width="190" height="7.69" fill="#fff"/>
    <rect y="69.23" width="190" height="7.69" fill="#fff"/>
    <rect y="84.62" width="190" height="7.69" fill="#fff"/>
    <rect width="76" height="53.85" fill="#002868"/>
    <g fill="#fff">
      <circle cx="9" cy="5" r="2"/>
      <circle cx="25" cy="5" r="2"/>
      <circle cx="41" cy="5" r="2"/>
      <circle cx="57" cy="5" r="2"/>
      <circle cx="17" cy="12" r="2"/>
      <circle cx="33" cy="12" r="2"/>
      <circle cx="49" cy="12" r="2"/>
      <circle cx="65" cy="12" r="2"/>
      <circle cx="9" cy="19" r="2"/>
      <circle cx="25" cy="19" r="2"/>
      <circle cx="41" cy="19" r="2"/>
      <circle cx="57" cy="19" r="2"/>
      <circle cx="17" cy="26" r="2"/>
      <circle cx="33" cy="26" r="2"/>
      <circle cx="49" cy="26" r="2"/>
      <circle cx="65" cy="26" r="2"/>
      <circle cx="9" cy="33" r="2"/>
      <circle cx="25" cy="33" r="2"/>
      <circle cx="41" cy="33" r="2"/>
      <circle cx="57" cy="33" r="2"/>
      <circle cx="17" cy="40" r="2"/>
      <circle cx="33" cy="40" r="2"/>
      <circle cx="49" cy="40" r="2"/>
      <circle cx="65" cy="40" r="2"/>
      <circle cx="9" cy="47" r="2"/>
      <circle cx="25" cy="47" r="2"/>
      <circle cx="41" cy="47" r="2"/>
      <circle cx="57" cy="47" r="2"/>
    </g>
  </svg>
);

const FlagSpain = () => (
  <svg viewBox="0 0 750 500" className="w-6 h-4 rounded-sm shadow-sm">
    <rect width="750" height="500" fill="#c60b1e"/>
    <rect width="750" height="250" y="125" fill="#ffc400"/>
  </svg>
);

const FlagChina = () => (
  <svg viewBox="0 0 30 20" className="w-6 h-4 rounded-sm shadow-sm">
    <rect width="30" height="20" fill="#de2910"/>
    <g fill="#ffde00">
      <polygon points="5,4 6.24,7.82 2.18,5.53 7.82,5.53 3.76,7.82"/>
      <polygon points="10,1 10.59,2.82 8.65,1.76 11.35,1.76 9.41,2.82" transform="rotate(23.04 10 1.5)"/>
      <polygon points="12,3 12.59,4.82 10.65,3.76 13.35,3.76 11.41,4.82" transform="rotate(45.87 12 3.5)"/>
      <polygon points="12,6 12.59,7.82 10.65,6.76 13.35,6.76 11.41,7.82" transform="rotate(69.95 12 6.5)"/>
      <polygon points="10,8 10.59,9.82 8.65,8.76 11.35,8.76 9.41,9.82" transform="rotate(20.66 10 8.5)"/>
    </g>
  </svg>
);

const flagComponents: Record<string, React.FC> = {
  'pt-BR': FlagBrazil,
  'en': FlagUSA,
  'es': FlagSpain,
  'zh': FlagChina,
};

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLanguage = languages.find(
    (lang) => lang.code === i18n.language || lang.code === i18n.language.split('-')[0]
  ) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const CurrentFlag = flagComponents[currentLanguage.code] || FlagBrazil;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 px-2 hover:bg-accent/50"
        >
          <CurrentFlag />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {languages.map((language) => {
          const FlagComponent = flagComponents[language.code];
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="gap-3 cursor-pointer"
            >
              <FlagComponent />
              <span className={language.code === currentLanguage.code ? 'font-medium' : ''}>
                {language.name}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
