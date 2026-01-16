import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  BarChart3, 
  Users, 
  Shield, 
  ChevronRight,
  Sparkles 
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface WelcomeStepProps {
  companyName: string;
  onStart: () => void;
  onSkip: () => void;
}

const WelcomeStep = ({ companyName, onStart, onSkip }: WelcomeStepProps) => {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: BarChart3,
      titleKey: "featurePowerBi",
      descKey: "featurePowerBiDesc",
    },
    {
      icon: Users,
      titleKey: "featureUsers",
      descKey: "featureUsersDesc",
    },
    {
      icon: Shield,
      titleKey: "featureSecurity",
      descKey: "featureSecurityDesc",
    },
  ];

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 shadow-glow"
      >
        <Rocket className="h-10 w-10 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-2">
          {t("onboarding.welcomeTitle", { name: companyName })}
          <Sparkles className="inline-block ml-2 h-6 w-6 text-yellow-500" />
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          {t("onboarding.welcomeSubtitle")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 mb-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.titleKey}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{t(`onboarding.${feature.titleKey}`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`onboarding.${feature.descKey}`)}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="space-y-3"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 shadow-glow"
        >
          {t("onboarding.startConfig")}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full text-muted-foreground"
        >
          {t("onboarding.configLater")}
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-xs text-muted-foreground"
      >
        ⏱️ {t("onboarding.estimatedTime")}
      </motion.p>
    </div>
  );
};

export default WelcomeStep;