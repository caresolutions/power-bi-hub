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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 px-2 hover:bg-accent/50"
        >
          <span className="text-xl leading-none">{currentLanguage.flag}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="gap-3 cursor-pointer"
          >
            <span className="text-xl leading-none">{language.flag}</span>
            <span className={language.code === currentLanguage.code ? 'font-medium' : ''}>
              {language.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
