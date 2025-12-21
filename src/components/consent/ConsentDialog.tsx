import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, CheckCircle } from "lucide-react";
import { privacyPolicyContent } from "@/content/privacyPolicy";

interface ConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export const ConsentDialog = ({ open, onAccept }: ConsentDialogProps) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const canAccept = hasScrolledToEnd && hasReadPolicy && acceptsTerms;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setHasScrolledToEnd(false);
      setHasReadPolicy(false);
      setAcceptsTerms(false);
    }
  }, [open]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Check if scrolled to bottom (with a small threshold)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
    
    if (isAtBottom && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (canAccept) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] flex flex-col p-0" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{privacyPolicyContent.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Última atualização: {privacyPolicyContent.lastUpdate}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            {hasScrolledToEnd ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Leitura completa
              </span>
            ) : (
              <span className="text-amber-600">
                ⚠️ Role até o final para continuar
              </span>
            )}
          </div>
          
          <ScrollArea className="h-[45vh] border rounded-lg">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-auto p-4"
              style={{ maxHeight: '45vh' }}
            >
              <div className="space-y-6">
                {privacyPolicyContent.sections.map((section, index) => (
                  <section key={index} className="space-y-2">
                    <h3 className="text-base font-semibold text-primary">{section.title}</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {section.content.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
                      )}
                    </div>
                  </section>
                ))}

                {/* End of document marker */}
                <div className="pt-4 border-t text-center text-sm text-muted-foreground">
                  — Fim da Política de Privacidade e Cookies —
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="border-t p-6 space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground whitespace-pre-line">
            {privacyPolicyContent.consentText}
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="read-policy" 
                checked={hasReadPolicy}
                onCheckedChange={(checked) => setHasReadPolicy(checked === true)}
                disabled={!hasScrolledToEnd}
              />
              <label 
                htmlFor="read-policy" 
                className={`text-sm cursor-pointer leading-relaxed ${!hasScrolledToEnd ? 'text-muted-foreground/50' : ''}`}
              >
                Li e compreendi a Política de Privacidade e Cookies apresentada acima
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="accept-terms" 
                checked={acceptsTerms}
                onCheckedChange={(checked) => setAcceptsTerms(checked === true)}
                disabled={!hasScrolledToEnd}
              />
              <label 
                htmlFor="accept-terms" 
                className={`text-sm cursor-pointer leading-relaxed ${!hasScrolledToEnd ? 'text-muted-foreground/50' : ''}`}
              >
                Concordo com a coleta e tratamento dos meus dados pessoais conforme descrito nesta política
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button 
            onClick={handleAccept} 
            disabled={!canAccept}
            className="w-full sm:w-auto"
            size="lg"
          >
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
