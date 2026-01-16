import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Shield, FileText, Loader2, Languages, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PolicySection {
  title: string;
  content: string;
}

interface LegalTerm {
  id: string;
  term_type: string;
  title: string;
  content: PolicySection[];
  last_update: string;
  version: string;
}

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [translating, setTranslating] = useState(false);
  const [translatedTerm, setTranslatedTerm] = useState<LegalTerm | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const currentLanguage = i18n.language;
  const isPortuguese = currentLanguage === 'pt-BR' || currentLanguage === 'pt';

  const { data: term, isLoading } = useQuery({
    queryKey: ['legal-term', 'privacy_policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_terms')
        .select('*')
        .eq('term_type', 'privacy_policy')
        .single();

      if (error) throw error;

      return {
        ...data,
        content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content
      } as LegalTerm;
    }
  });

  // Reset translation when language changes
  useEffect(() => {
    setTranslatedTerm(null);
    setShowTranslated(false);
  }, [currentLanguage]);

  const handleTranslate = async () => {
    if (!term) return;

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          content: {
            title: term.title,
            content: term.content
          },
          targetLanguage: currentLanguage
        }
      });

      if (error) throw error;

      setTranslatedTerm({
        ...term,
        title: data.translatedContent.title,
        content: data.translatedContent.content
      });
      setShowTranslated(true);
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('legalTerms.translationError'));
    } finally {
      setTranslating(false);
    }
  };

  const displayTerm = showTranslated && translatedTerm ? translatedTerm : term;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!term) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{t('legalTerms.privacyPolicy')}</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('legalTerms.notFound')}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{displayTerm?.title}</h1>
            </div>
          </div>
          
          {!isPortuguese && (
            <div className="flex items-center gap-2">
              {showTranslated ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTranslated(false)}
                >
                  <Languages className="h-4 w-4 mr-2" />
                  {t('legalTerms.showOriginal')}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTranslate}
                  disabled={translating}
                >
                  {translating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('legalTerms.translating')}
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4 mr-2" />
                      {t('legalTerms.translateContent')}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {showTranslated && (
          <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              {t('legalTerms.translatedDisclaimer')}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">
                {t('legalTerms.lastUpdate')}: {term.last_update} | {t('legalTerms.version')}: {term.version}
              </span>
            </div>
            <CardTitle className="text-2xl">{displayTerm?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-8 pr-4">
                {displayTerm?.content.map((section, index) => (
                  <section key={index} className="space-y-3">
                    <h2 className="text-lg font-semibold text-primary">{section.title}</h2>
                    <div className="text-muted-foreground whitespace-pre-line leading-relaxed prose prose-sm max-w-none">
                      {section.content.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
