import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChatDataChart, ChartType } from "./ChatDataChart";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  daxQuery?: string;
  chartData?: any[];
  suggestedChartType?: ChartType;
  timestamp: Date;
}

interface DashboardChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
}

export function DashboardChatDialog({
  open,
  onOpenChange,
  dashboardId,
  dashboardName,
}: DashboardChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("query-dataset-chat", {
        body: { dashboardId, question: userMessage.content },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erro ao processar pergunta");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        daxQuery: data.daxQuery,
        chartData: data.chartData,
        suggestedChartType: data.suggestedChartType || "bar",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Não foi possível processar sua pergunta.";
      if (error.message?.includes("dataset")) {
        errorMessage = "Este dashboard não possui um dataset configurado para consultas.";
      } else if (error.message?.includes("DAX")) {
        errorMessage = "Erro ao executar a consulta. Verifique se você tem licença Power BI Premium ou PPU.";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });

      const errorAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAssistant]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Chat com Dados - {dashboardName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Faça perguntas sobre os dados do dashboard.
                </p>
                <p className="text-xs mt-2">
                  Exemplos: "Qual o top 10 de empresas?", "Total de vendas por mês"
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Chart visualization */}
                  {message.chartData && message.chartData.length > 0 && (
                    <ChatDataChart 
                      data={message.chartData} 
                      suggestedType={message.suggestedChartType || "bar"} 
                    />
                  )}
                  
                  {message.daxQuery && (
                    <Collapsible className="mt-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          Ver query DAX
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-2 p-2 bg-background/50 rounded text-xs overflow-x-auto">
                          {message.daxQuery}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faça uma pergunta sobre os dados..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Requer Power BI Premium ou Premium Per User
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
