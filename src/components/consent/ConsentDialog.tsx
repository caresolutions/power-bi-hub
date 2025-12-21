import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, ExternalLink } from "lucide-react";
import { privacyPolicyContent } from "@/content/privacyPolicy";
import { Link } from "react-router-dom";

interface ConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export const ConsentDialog = ({ open, onAccept }: ConsentDialogProps) => {
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);

  const canAccept = hasReadPolicy && acceptsTerms;

  const handleAccept = () => {
    if (canAccept) {
      localStorage.setItem("privacy_consent", JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: privacyPolicyContent.lastUpdate
      }));
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
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

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          <div className="space-y-6">
            {privacyPolicyContent.sections.map((section, index) => (
              <section key={index} className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">{section.title}</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
                  )}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground whitespace-pre-line">
            {privacyPolicyContent.consentText}
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="read-policy" 
                checked={hasReadPolicy}
                onCheckedChange={(checked) => setHasReadPolicy(checked === true)}
              />
              <label htmlFor="read-policy" className="text-sm cursor-pointer leading-relaxed">
                Li e compreendi a Política de Privacidade e Cookies apresentada acima
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="accept-terms" 
                checked={acceptsTerms}
                onCheckedChange={(checked) => setAcceptsTerms(checked === true)}
              />
              <label htmlFor="accept-terms" className="text-sm cursor-pointer leading-relaxed">
                Concordo com a coleta e tratamento dos meus dados pessoais conforme descrito nesta política
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Link to="/privacy-policy" target="_blank" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Ver política completa
            </Button>
          </Link>
          <Button 
            onClick={handleAccept} 
            disabled={!canAccept}
            className="w-full sm:w-auto"
          >
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
