import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, ChevronRight } from "lucide-react";
import { z } from "zod";
import CompanyRegistrationForm from "@/components/company/CompanyRegistrationForm";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const signupSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  fullName: z
    .string()
    .trim()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [needsCompanyRegistration, setNeedsCompanyRegistration] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndCompany();
  }, []);

  const checkAuthAndCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is admin and needs company registration
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (role?.role === 'admin') {
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id")
            .eq("id", user.id)
            .single();

          if (!profile?.company_id) {
            setNeedsCompanyRegistration(true);
            setCheckingAuth(false);
            return;
          }
        }
        
        navigate("/home");
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleCompanyRegistrationSuccess = () => {
    setNeedsCompanyRegistration(false);
    navigate("/home");
  };

  const validateForm = () => {
    setErrors({});
    
    const schema = isLogin ? loginSchema : signupSchema;
    const data = isLogin 
      ? { email, password } 
      : { email, password, fullName };
    
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    return true;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValidation = z.string().trim().email("E-mail inválido").safeParse(email);
    if (!emailValidation.success) {
      setErrors({ email: emailValidation.error.errors[0].message });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email: email.trim(),
          redirectUrl: `${window.location.origin}/auth?reset=true`,
        },
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar e-mail de recuperação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Check if user is active
        if (authData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id, is_active")
            .eq("id", authData.user.id)
            .single();

          // Check if user is inactive
          if (profile && profile.is_active === false) {
            await supabase.auth.signOut();
            toast({
              title: "Acesso bloqueado",
              description: "Sua conta está inativa. Entre em contato com o administrador.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Check if admin needs company registration
          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authData.user.id)
            .single();

          if (role?.role === 'admin' && !profile?.company_id) {
            setNeedsCompanyRegistration(true);
            setLoading(false);
            return;
          }
        }

        toast({
          title: "Login realizado!",
          description: "Você será redirecionado...",
        });
        
        navigate("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Complete o cadastro da sua empresa...",
        });
        
        // New admin needs to register company
        setNeedsCompanyRegistration(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (needsCompanyRegistration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="relative z-10 w-full">
          <CompanyRegistrationForm onSuccess={handleCompanyRegistrationSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-1 mb-4">
              <span className="text-2xl font-bold text-foreground">care</span>
              <ChevronRight className="h-5 w-5 text-primary" />
              <ChevronRight className="h-5 w-5 text-primary -ml-3" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isForgotPassword 
                ? "Recuperar senha" 
                : isLogin 
                  ? "Bem-vindo de volta" 
                  : "Criar conta"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isForgotPassword
                ? "Digite seu e-mail para receber o link de recuperação"
                : isLogin
                  ? "Entre com suas credenciais"
                  : "Comece sua jornada conosco"}
            </p>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`bg-background/50 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 shadow-glow"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrors({});
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar para o login
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className={`bg-background/50 ${errors.fullName ? 'border-destructive' : ''}`}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={`bg-background/50 ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`bg-background/50 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  {!isLogin && !errors.password && (
                    <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres, com maiúscula, minúscula e número
                    </p>
                  )}
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setErrors({});
                      }}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 shadow-glow"
                  disabled={loading}
                >
                  {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLogin
                    ? "Não tem uma conta? Cadastre-se"
                    : "Já tem uma conta? Entre"}
                </button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
