import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save, FileText, FileX, Shield, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export const LegalTermsEditor = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [terms, setTerms] = useState<LegalTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('cancellation_policy');

  const TERM_TYPES = [
    { key: 'cancellation_policy', label: t('legalTerms.cancellationPolicy'), icon: FileX, route: '/cancellation-policy' },
    { key: 'privacy_policy', label: t('legalTerms.privacyPolicy'), icon: Shield, route: '/privacy-policy' },
  ];

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_terms')
        .select('*');

      if (error) throw error;

      const parsedTerms = (data || []).map(term => ({
        ...term,
        content: typeof term.content === 'string' ? JSON.parse(term.content) : term.content
      }));

      setTerms(parsedTerms as LegalTerm[]);
    } catch (error) {
      console.error('Error fetching terms:', error);
      toast.error(t('legalTerms.termsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const getTerm = (termType: string): LegalTerm | undefined => {
    return terms.find(t => t.term_type === termType);
  };

  const updateTerm = (termType: string, updates: Partial<LegalTerm>) => {
    setTerms(prev => prev.map(t => 
      t.term_type === termType ? { ...t, ...updates } : t
    ));
  };

  const updateSection = (termType: string, sectionIndex: number, field: 'title' | 'content', value: string) => {
    const term = getTerm(termType);
    if (!term) return;

    const newContent = [...term.content];
    newContent[sectionIndex] = { ...newContent[sectionIndex], [field]: value };
    updateTerm(termType, { content: newContent });
  };

  const addSection = (termType: string) => {
    const term = getTerm(termType);
    if (!term) return;

    const newSection: PolicySection = {
      title: `${term.content.length + 1}. ${t('common.new')}`,
      content: '...'
    };
    updateTerm(termType, { content: [...term.content, newSection] });
  };

  const removeSection = (termType: string, sectionIndex: number) => {
    const term = getTerm(termType);
    if (!term || term.content.length <= 1) {
      toast.error(t('legalTerms.minOneSection'));
      return;
    }

    const newContent = term.content.filter((_, i) => i !== sectionIndex);
    updateTerm(termType, { content: newContent });
  };

  const saveTerm = async (termType: string) => {
    const term = getTerm(termType);
    if (!term) return;

    setSaving(true);
    try {
      const today = new Date();
      const locale = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';
      const formattedDate = today.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const currentVersion = parseFloat(term.version) || 1.0;
      const newVersion = (currentVersion + 0.1).toFixed(1);

      const { error } = await supabase
        .from('legal_terms')
        .update({
          title: term.title,
          content: JSON.parse(JSON.stringify(term.content)),
          last_update: formattedDate,
          version: newVersion
        })
        .eq('id', term.id);

      if (error) throw error;

      updateTerm(termType, { last_update: formattedDate, version: newVersion });
      toast.success(t('legalTerms.termsUpdated'));
    } catch (error) {
      console.error('Error saving term:', error);
      toast.error(t('legalTerms.termsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const viewTerm = (route: string) => {
    navigate(route);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('legalTerms.editor')}
        </CardTitle>
        <CardDescription>
          {t('legalTerms.editorDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {TERM_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <TabsTrigger key={type.key} value={type.key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {type.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TERM_TYPES.map(type => {
            const term = getTerm(type.key);
            
            return (
              <TabsContent key={type.key} value={type.key}>
                {term ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {t('legalTerms.lastUpdate')}: {term.last_update} | {t('legalTerms.version')}: {term.version}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => viewTerm(type.route)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('legalTerms.view')}
                        </Button>
                        <Button onClick={() => saveTerm(type.key)} disabled={saving}>
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          {t('legalTerms.saveChanges')}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`title-${type.key}`}>{t('legalTerms.documentTitle')}</Label>
                        <Input
                          id={`title-${type.key}`}
                          value={term.title}
                          onChange={(e) => updateTerm(type.key, { title: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>{t('legalTerms.documentSections')}</Label>
                          <Button variant="outline" size="sm" onClick={() => addSection(type.key)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('legalTerms.addSection')}
                          </Button>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                          {term.content.map((section, index) => (
                            <AccordionItem key={index} value={`section-${index}`}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{section.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <Label>{t('legalTerms.sectionTitle')}</Label>
                                    <Input
                                      value={section.title}
                                      onChange={(e) => updateSection(type.key, index, 'title', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label>{t('legalTerms.content')}</Label>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {t('legalTerms.boldHelp')}
                                    </p>
                                    <Textarea
                                      value={section.content}
                                      onChange={(e) => updateSection(type.key, index, 'content', e.target.value)}
                                      className="mt-1 min-h-[200px] font-mono text-sm"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeSection(type.key, index)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {t('legalTerms.removeSection')}
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <type.icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {type.label} {t('legalTerms.notFound')}
                    </p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};