import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Shield, Eye, UserPlus, AlertCircle, Check, ChevronRight } from "lucide-react";
import careLogo from "@/assets/logo_care_azul.png";
import { z } from "zod";
import CompanyRegistrationForm from "@/components/company/CompanyRegistrationForm";
import ChangePasswordDialog from "@/components/auth/ChangePasswordDialog";

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

type SignupStep = "role-selection" | "form";
type SelectedRole = "admin" | "user" | null;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [needsCompanyRegistration, setNeedsCompanyRegistration] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  
  // New signup flow states
  const [signupStep, setSignupStep] = useState<SignupStep>("role-selection");
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [showUserAlert, setShowUserAlert] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuthAndCompany();
    
    // Handle password reset flow from URL
    const handlePasswordReset = async () => {
      // Check if this is a password recovery flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      // Handle error in URL (e.g., expired link)
      if (error) {
        console.error("Auth error from URL:", error, errorDescription);
        const friendlyMessage = errorDescription?.includes('expired') 
          ? "O link expirou. Por favor, solicite um novo link de recuperação."
          : errorDescription?.replace(/\+/g, ' ') || "Erro na autenticação.";
        
        toast({
          title: "Link inválido",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        // Clear hash from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsForgotPassword(true);
        setCheckingAuth(false);
        return;
      }
      
      if (type === 'recovery' && accessToken) {
        console.log("Password recovery flow detected");
        setIsResettingPassword(true);
        setCheckingAuth(false);
        
        // Set the session with the recovery token
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (sessionError) {
          console.error("Error setting session:", sessionError);
          toast({
            title: "Erro",
            description: "Link de recuperação inválido ou expirado. Solicite um novo link.",
            variant: "destructive",
          });
          setIsResettingPassword(false);
          setIsForgotPassword(true);
          // Clear hash from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    handlePasswordReset();
  }, []);

  const checkAuthAndCompany = async () => {
    try {
      // Skip if in password reset flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('type') === 'recovery') {
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user needs to change password
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, must_change_password")
          .eq("id", user.id)
          .single();

        if (profile?.must_change_password) {
          setNeedsPasswordChange(true);
          setCheckingAuth(false);
          return;
        }

        // Check if user is admin and needs company registration
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (role?.role === 'admin') {
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

  const handlePasswordChangeSuccess = () => {
    setNeedsPasswordChange(false);
    navigate("/home");
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate passwords
    if (password.length < 8) {
      setErrors({ password: "Senha deve ter no mínimo 8 caracteres" });
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setErrors({ password: "Senha deve conter pelo menos uma letra maiúscula" });
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setErrors({ password: "Senha deve conter pelo menos uma letra minúscula" });
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setErrors({ password: "Senha deve conter pelo menos um número" });
      return;
    }
    
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "As senhas não coincidem" });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setPasswordResetSuccess(true);
      
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi redefinida com sucesso.",
      });
      
      // Clear hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // After a moment, redirect to login
      setTimeout(() => {
        setIsResettingPassword(false);
        setPasswordResetSuccess(false);
        setPassword("");
        setConfirmPassword("");
        setIsLogin(true);
      }, 2000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      
      // Check for HIBP compromised password error
      const errorMessage = error.message?.toLowerCase() || '';
      const isCompromisedPassword = 
        errorMessage.includes('compromised') || 
        errorMessage.includes('pwned') ||
        errorMessage.includes('weak_password') ||
        errorMessage.includes('data breach') ||
        error.code === 'weak_password';
      
      if (isCompromisedPassword) {
        setErrors({
          password: "Esta senha foi encontrada em vazamentos de dados. Por segurança, escolha outra senha.",
        });
        toast({
          title: "Senha comprometida detectada",
          description: "Sua senha aparece em bancos de dados de vazamentos conhecidos. Por favor, escolha uma senha mais segura.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message || "Erro ao redefinir senha",
          variant: "destructive",
        });
      }
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

        // Check if user is active and needs password change
        if (authData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id, is_active, must_change_password")
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

          // Check if needs password change
          if (profile?.must_change_password) {
            setNeedsPasswordChange(true);
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
        // Only admins can self-register
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
      // Check for HIBP compromised password error
      const errorMessage = error.message?.toLowerCase() || '';
      const isCompromisedPassword = 
        errorMessage.includes('compromised') || 
        errorMessage.includes('pwned') ||
        errorMessage.includes('weak_password') ||
        errorMessage.includes('data breach') ||
        error.code === 'weak_password';
      
      if (isCompromisedPassword) {
        setErrors({
          password: "Esta senha foi encontrada em vazamentos de dados. Por segurança, escolha outra senha.",
        });
        toast({
          title: "Senha comprometida detectada",
          description: "Sua senha aparece em bancos de dados de vazamentos conhecidos. Por favor, escolha uma senha mais segura que não tenha sido exposta anteriormente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (role: SelectedRole) => {
    if (role === "user") {
      setShowUserAlert(true);
    } else {
      setSelectedRole(role);
      setSignupStep("form");
    }
  };

  const resetSignupFlow = () => {
    setSignupStep("role-selection");
    setSelectedRole(null);
    setShowUserAlert(false);
    setEmail("");
    setPassword("");
    setFullName("");
    setErrors({});
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Show password change dialog
  if (needsPasswordChange) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <ChangePasswordDialog 
          open={true} 
          onSuccess={handlePasswordChangeSuccess}
        />
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

  // Password reset form
  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <img src={careLogo} alt="Care" className="h-10 w-auto" />
              </div>
              
              {passwordResetSuccess ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Senha redefinida!</h1>
                  <p className="text-muted-foreground text-sm">
                    Você será redirecionado para o login...
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mb-2">Nova senha</h1>
                  <p className="text-muted-foreground text-sm">
                    Digite sua nova senha
                  </p>
                </>
              )}
            </div>

            {!passwordResetSuccess && (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Nova senha
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
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, com maiúscula, minúscula e número
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`bg-background/50 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 shadow-glow"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Redefinir senha"}
                </Button>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render role selection for signup
  const renderRoleSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Como você deseja se cadastrar?</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o tipo de conta que deseja criar
        </p>
      </div>

      {showUserAlert ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <Alert className="border-primary/50 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Convite necessário</AlertTitle>
            <AlertDescription className="mt-2">
              Para se cadastrar como <strong>Usuário</strong>, você precisa receber um convite de um administrador da sua empresa.
              <br /><br />
              Solicite ao administrador que envie um convite para o seu e-mail. Você receberá uma senha provisória para acessar o sistema.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowUserAlert(false)}
            >
              Voltar
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                setShowUserAlert(false);
                setIsLogin(true);
              }}
            >
              Já tenho convite
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelection("admin")}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all text-left"
          >
            <div className="bg-primary/10 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Administrador</h3>
              <p className="text-sm text-muted-foreground">
                Crie sua empresa e gerencie dashboards, usuários e assinaturas. Teste grátis por 7 dias.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelection("user")}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all text-left"
          >
            <div className="bg-muted/50 p-3 rounded-lg">
              <Eye className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Usuário</h3>
              <p className="text-sm text-muted-foreground">
                Acesse dashboards compartilhados pela sua empresa. Requer convite do administrador.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        </div>
      )}

      <div className="text-center pt-4">
        <button
          onClick={() => {
            setIsLogin(true);
            resetSignupFlow();
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Já tem uma conta? Entre
        </button>
      </div>
    </div>
  );

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
          onClick={() => {
            if (!isLogin && signupStep === "form") {
              resetSignupFlow();
            } else {
              navigate("/");
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={careLogo} alt="Care" className="h-10 w-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isForgotPassword 
                ? "Recuperar senha" 
                : isLogin 
                  ? "Bem-vindo de volta" 
                  : signupStep === "role-selection"
                    ? "Criar conta"
                    : "Cadastro de Administrador"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isForgotPassword
                ? "Digite seu e-mail para receber o link de recuperação"
                : isLogin
                  ? "Entre com suas credenciais"
                  : signupStep === "role-selection"
                    ? "Escolha como deseja acessar a plataforma"
                    : "Crie sua conta e configure sua empresa"}
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
          ) : !isLogin && signupStep === "role-selection" ? (
            renderRoleSelection()
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
                    if (isLogin) {
                      setIsLogin(false);
                      resetSignupFlow();
                    } else {
                      setIsLogin(true);
                      resetSignupFlow();
                    }
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
