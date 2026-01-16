import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileX, FileText, Loader2, Languages, AlertTriangle } from "lucide-react";
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

const CancellationPolicy = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [policy, setPolicy] = useState<LegalTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translatedPolicy, setTranslatedPolicy] = useState<LegalTerm | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const currentLanguage = i18n.language;
  const isPortuguese = currentLanguage === 'pt-BR' || currentLanguage === 'pt';

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data, error } = await supabase
          .from('legal_terms')
          .select('*')
          .eq('term_type', 'cancellation_policy')
          .single();

        if (error) throw error;
        
        const parsedData = {
          ...data,
          content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        };
        
        setPolicy(parsedData as LegalTerm);
      } catch (error) {
        console.error('Error fetching cancellation policy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  // Reset translation when language changes
  useEffect(() => {
    setTranslatedPolicy(null);
    setShowTranslated(false);
  }, [currentLanguage]);

  const handleTranslate = async () => {
    if (!policy) return;

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          content: {
            title: policy.title,
            content: policy.content
          },
          targetLanguage: currentLanguage
        }
      });

      if (error) throw error;

      setTranslatedPolicy({
        ...policy,
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

  const displayPolicy = showTranslated && translatedPolicy ? translatedPolicy : policy;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('legalTerms.notFound')}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
              {t('legalTerms.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileX className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{displayPolicy?.title}</h1>
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
                {t('legalTerms.lastUpdate')}: {policy.last_update} | {t('legalTerms.version')}: {policy.version}
              </span>
            </div>
            <CardTitle className="text-2xl">{displayPolicy?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-8 pr-4">
                {displayPolicy?.content.map((section, index) => (
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

export default CancellationPolicy;
