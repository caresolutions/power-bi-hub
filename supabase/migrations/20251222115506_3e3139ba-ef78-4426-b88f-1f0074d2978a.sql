-- Create table to store editable legal terms/policies
CREATE TABLE public.legal_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_type text NOT NULL UNIQUE, -- 'cancellation_policy', 'privacy_policy', 'terms_of_service'
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of sections with title and content
  last_update text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.legal_terms ENABLE ROW LEVEL SECURITY;

-- Everyone can read legal terms (they're public documents)
CREATE POLICY "Anyone can view legal terms"
ON public.legal_terms
FOR SELECT
USING (true);

-- Only master admins can manage legal terms
CREATE POLICY "Master admins can manage legal terms"
ON public.legal_terms
FOR ALL
USING (is_master_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_legal_terms_updated_at
BEFORE UPDATE ON public.legal_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default cancellation policy following Brazilian CDC
INSERT INTO public.legal_terms (term_type, title, content, last_update, version) VALUES (
  'cancellation_policy',
  'Política de Cancelamento e Reembolso',
  '[
    {
      "title": "1. Introdução",
      "content": "Esta Política de Cancelamento e Reembolso foi elaborada em conformidade com o Código de Defesa do Consumidor (CDC - Lei nº 8.078/1990) e demais legislações aplicáveis do Brasil.\n\nA Care BI respeita os direitos dos consumidores e estabelece regras claras e transparentes para cancelamento de assinaturas e solicitação de reembolsos."
    },
    {
      "title": "2. Direito de Arrependimento",
      "content": "**2.1. Prazo Legal:**\nConforme o artigo 49 do CDC, o consumidor pode desistir do contrato no prazo de **7 (sete) dias** a contar da assinatura ou do recebimento do serviço, sempre que a contratação ocorrer fora do estabelecimento comercial (internet, telefone, etc.).\n\n**2.2. Exercício do Direito:**\n- O direito de arrependimento pode ser exercido sem necessidade de justificativa\n- A solicitação deve ser feita através dos canais de atendimento oficiais\n- O reembolso integral será realizado em até 30 dias\n\n**2.3. Valores a Restituir:**\n- Todos os valores pagos serão devolvidos integralmente\n- A devolução será feita pelo mesmo meio de pagamento utilizado na compra"
    },
    {
      "title": "3. Cancelamento de Assinatura",
      "content": "**3.1. Como Cancelar:**\nVocê pode cancelar sua assinatura a qualquer momento através de:\n- Portal de gerenciamento de assinatura na plataforma\n- Chat de suporte integrado\n- E-mail para o suporte técnico\n\n**3.2. Efeitos do Cancelamento:**\n- O cancelamento entra em vigor ao final do período de cobrança vigente\n- Você mantém acesso ao serviço até o término do período já pago\n- Não há cobranças adicionais após a confirmação do cancelamento\n\n**3.3. Período de Fidelidade:**\n- Planos mensais: sem período mínimo de fidelidade\n- Planos anuais: proporcionalidade conforme descrito na seção 4"
    },
    {
      "title": "4. Política de Reembolso",
      "content": "**4.1. Reembolso em Planos Mensais:**\n- Cancelamentos dentro dos 7 dias de arrependimento: reembolso integral\n- Cancelamentos após 7 dias: sem reembolso do período corrente, mas sem cobranças futuras\n\n**4.2. Reembolso em Planos Anuais:**\n- Cancelamentos dentro dos 7 dias de arrependimento: reembolso integral\n- Cancelamentos após 7 dias: reembolso proporcional aos meses não utilizados, descontada taxa administrativa de 10%\n\n**4.3. Prazo de Devolução:**\n- O reembolso será processado em até 30 dias após a aprovação da solicitação\n- O prazo para estorno no cartão pode variar conforme a operadora (até 2 faturas)\n- Reembolsos via PIX ou transferência: até 7 dias úteis"
    },
    {
      "title": "5. Casos de Reembolso Garantido",
      "content": "Independentemente do prazo, o reembolso integral será garantido nos seguintes casos:\n\n**5.1. Falha no Serviço:**\n- Indisponibilidade superior a 48 horas consecutivas\n- Funcionalidades essenciais indisponíveis por mais de 72 horas no mês\n- Perda de dados por falha da plataforma\n\n**5.2. Vícios do Serviço:**\n- Serviço não corresponde às especificações anunciadas\n- Impossibilidade de uso por incompatibilidade técnica não informada previamente\n\n**5.3. Cobrança Indevida:**\n- Valores cobrados em duplicidade\n- Cobranças após cancelamento confirmado\n- Valores diferentes do contratado"
    },
    {
      "title": "6. Procedimento de Cancelamento",
      "content": "**6.1. Passo a Passo:**\n1. Acesse sua conta na plataforma\n2. Navegue até \"Gerenciar Assinatura\" ou entre em contato pelo chat\n3. Selecione a opção de cancelamento\n4. Confirme sua solicitação\n5. Aguarde o e-mail de confirmação\n\n**6.2. Confirmação:**\n- Você receberá confirmação por e-mail em até 24 horas\n- O protocolo de cancelamento será disponibilizado\n- Guarde o comprovante para eventual necessidade\n\n**6.3. Prazo de Processamento:**\n- Cancelamentos são processados em até 2 dias úteis\n- Em períodos de alta demanda, pode estender-se até 5 dias úteis"
    },
    {
      "title": "7. Dados Após o Cancelamento",
      "content": "**7.1. Retenção de Dados:**\nConforme a LGPD e o Marco Civil da Internet:\n- Dados de conta: mantidos por 5 anos após o cancelamento\n- Logs de acesso: mantidos por 6 meses\n- Dados podem ser solicitados para eliminação antecipada\n\n**7.2. Exportação de Dados:**\n- Você pode solicitar exportação dos seus dados antes do cancelamento\n- A exportação será disponibilizada em formato compatível\n- Prazo de até 15 dias para disponibilização"
    },
    {
      "title": "8. Exceções e Casos Especiais",
      "content": "**8.1. Período de Teste Gratuito:**\n- Cancelamento pode ser feito a qualquer momento durante o teste\n- Não há cobrança se cancelado antes do término do período de teste\n- Após o teste, aplicam-se as regras de assinatura regular\n\n**8.2. Promoções e Descontos:**\n- Cancelamentos de planos promocionais seguem as mesmas regras\n- Descontos concedidos são considerados na proporcionalidade do reembolso\n\n**8.3. Planos Gerenciados por Master Admin:**\n- Cancelamentos devem ser solicitados ao administrador responsável\n- Políticas específicas da empresa contratante podem aplicar-se"
    },
    {
      "title": "9. Direitos do Consumidor",
      "content": "De acordo com o CDC, são garantidos ao consumidor:\n\n- **Informação clara:** sobre preços, condições e características do serviço\n- **Proteção contratual:** contra cláusulas abusivas ou impostas\n- **Reparação de danos:** patrimoniais e morais, individuais ou coletivos\n- **Facilitação de defesa:** inclusive com inversão do ônus da prova\n- **Adequação:** modificação de cláusulas que estabeleçam prestações desproporcionais\n\n**Órgãos de Defesa:**\n- PROCON do seu estado\n- Consumidor.gov.br (plataforma oficial do governo)\n- Juizados Especiais Cíveis"
    },
    {
      "title": "10. Contato e Suporte",
      "content": "Para solicitar cancelamento ou esclarecer dúvidas:\n\n**Canais de Atendimento:**\n- Chat integrado na plataforma (resposta em até 4 horas em horário comercial)\n- Portal de gerenciamento de assinatura\n\n**Horário de Atendimento:**\n- Segunda a Sexta: 9h às 18h (horário de Brasília)\n- Solicitações fora do horário serão processadas no próximo dia útil\n\n**Prazo de Resposta:**\n- Solicitações de cancelamento: até 48 horas\n- Solicitações de reembolso: até 5 dias úteis para análise"
    },
    {
      "title": "11. Alterações nesta Política",
      "content": "Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas:\n\n- Por e-mail aos assinantes ativos\n- Por notificação na plataforma\n- A data de última atualização será modificada\n\nAlterações não afetam cancelamentos ou reembolsos já solicitados antes da mudança.\n\nRecomendamos revisar esta política periodicamente."
    }
  ]'::jsonb,
  '22 de dezembro de 2024',
  '1.0'
);