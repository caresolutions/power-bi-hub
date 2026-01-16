import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CurrencyRate {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  rate_to_brl: number;
  is_base_currency: boolean;
  is_active: boolean;
  updated_at: string;
}

const CurrencyRatesManager = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRates, setEditingRates] = useState<Record<string, number>>({});
  const [newCurrency, setNewCurrency] = useState({
    currency_code: "",
    currency_name: "",
    currency_symbol: "",
    rate_to_brl: 1,
  });

  const { data: rates, isLoading } = useQuery({
    queryKey: ["currency-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("*")
        .order("is_base_currency", { ascending: false })
        .order("currency_code");

      if (error) throw error;
      return data as CurrencyRate[];
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, rate_to_brl }: { id: string; rate_to_brl: number }) => {
      const { error } = await supabase
        .from("currency_rates")
        .update({ rate_to_brl })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-rates"] });
      toast.success(t("currencyRates.rateUpdated"));
    },
    onError: (error) => {
      toast.error(t("currencyRates.updateError"));
      console.error(error);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("currency_rates")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-rates"] });
      toast.success(t("currencyRates.statusUpdated"));
    },
    onError: (error) => {
      toast.error(t("currencyRates.updateError"));
      console.error(error);
    },
  });

  const addCurrencyMutation = useMutation({
    mutationFn: async (currency: typeof newCurrency) => {
      const { error } = await supabase
        .from("currency_rates")
        .insert([currency]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-rates"] });
      toast.success(t("currencyRates.currencyAdded"));
      setIsAddDialogOpen(false);
      setNewCurrency({
        currency_code: "",
        currency_name: "",
        currency_symbol: "",
        rate_to_brl: 1,
      });
    },
    onError: (error) => {
      toast.error(t("currencyRates.addError"));
      console.error(error);
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("currency_rates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-rates"] });
      toast.success(t("currencyRates.currencyDeleted"));
    },
    onError: (error) => {
      toast.error(t("currencyRates.deleteError"));
      console.error(error);
    },
  });

  const handleRateChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setEditingRates((prev) => ({ ...prev, [id]: numValue }));
    }
  };

  const handleSaveRate = (id: string) => {
    const rate = editingRates[id];
    if (rate) {
      updateRateMutation.mutate({ id, rate_to_brl: rate });
      setEditingRates((prev) => {
        const newRates = { ...prev };
        delete newRates[id];
        return newRates;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("currencyRates.title")}
            </CardTitle>
            <CardDescription>{t("currencyRates.description")}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("currencyRates.addCurrency")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("currencyRates.addNewCurrency")}</DialogTitle>
                <DialogDescription>
                  {t("currencyRates.addNewCurrencyDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency_code">{t("currencyRates.currencyCode")}</Label>
                  <Input
                    id="currency_code"
                    value={newCurrency.currency_code}
                    onChange={(e) =>
                      setNewCurrency((prev) => ({
                        ...prev,
                        currency_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="USD, EUR, GBP..."
                    maxLength={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency_name">{t("currencyRates.currencyName")}</Label>
                  <Input
                    id="currency_name"
                    value={newCurrency.currency_name}
                    onChange={(e) =>
                      setNewCurrency((prev) => ({
                        ...prev,
                        currency_name: e.target.value,
                      }))
                    }
                    placeholder="US Dollar, Euro..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency_symbol">{t("currencyRates.currencySymbol")}</Label>
                  <Input
                    id="currency_symbol"
                    value={newCurrency.currency_symbol}
                    onChange={(e) =>
                      setNewCurrency((prev) => ({
                        ...prev,
                        currency_symbol: e.target.value,
                      }))
                    }
                    placeholder="$, €, £..."
                    maxLength={5}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rate_to_brl">{t("currencyRates.rateToBRL")}</Label>
                  <Input
                    id="rate_to_brl"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    value={newCurrency.rate_to_brl}
                    onChange={(e) =>
                      setNewCurrency((prev) => ({
                        ...prev,
                        rate_to_brl: parseFloat(e.target.value) || 1,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("currencyRates.rateToBRLHelp")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => addCurrencyMutation.mutate(newCurrency)}
                  disabled={
                    !newCurrency.currency_code ||
                    !newCurrency.currency_name ||
                    !newCurrency.currency_symbol ||
                    addCurrencyMutation.isPending
                  }
                >
                  {addCurrencyMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("currencyRates.currency")}</TableHead>
              <TableHead>{t("currencyRates.symbol")}</TableHead>
              <TableHead>{t("currencyRates.rateToBRL")}</TableHead>
              <TableHead>{t("currencyRates.example")}</TableHead>
              <TableHead>{t("currencyRates.active")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates?.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{rate.currency_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {rate.currency_name}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{rate.currency_symbol}</TableCell>
                <TableCell>
                  {rate.is_base_currency ? (
                    <span className="text-muted-foreground">1.000000 (base)</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.000001"
                        min="0.000001"
                        className="w-32"
                        defaultValue={rate.rate_to_brl}
                        onChange={(e) => handleRateChange(rate.id, e.target.value)}
                      />
                      {editingRates[rate.id] && (
                        <Button
                          size="sm"
                          onClick={() => handleSaveRate(rate.id)}
                          disabled={updateRateMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    R$ 100 = {rate.currency_symbol}{" "}
                    {(100 * rate.rate_to_brl).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rate.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: rate.id, is_active: checked })
                    }
                    disabled={rate.is_base_currency}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {!rate.is_base_currency && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCurrencyMutation.mutate(rate.id)}
                      disabled={deleteCurrencyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CurrencyRatesManager;
