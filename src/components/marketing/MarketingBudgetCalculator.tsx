import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DollarSign, TrendingUp, Monitor, Video, Printer, Mail, Gift, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MarketingBudgetCalculator() {
  const [annualGCI, setAnnualGCI] = useState(200000);
  const [budgetPercent, setBudgetPercent] = useState(10);

  const annualBudget = annualGCI * (budgetPercent / 100);
  const monthlyBudget = annualBudget / 12;

  const allocations = [
    { label: "Digital Ads (Meta, Google)", percent: 45, icon: Monitor, color: "text-info" },
    { label: "Content & Video", percent: 18, icon: Video, color: "text-primary" },
    { label: "Local Branding/Print", percent: 12, icon: Printer, color: "text-warning" },
    { label: "CRM/Email/Tools", percent: 15, icon: Mail, color: "text-success" },
    { label: "Client Events/Gifts", percent: 10, icon: Gift, color: "text-destructive" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  };

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Marketing Budget Calculator</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">Marketing benchmark: 10% of GCI is a common rule-of-thumb. Growth-focused agents often allocate 10–20% depending on stage. Top producers may allocate 15–20% in growth years.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Annual GCI (or last year's GCI)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                className="bg-input pl-8"
                value={annualGCI}
                onChange={(e) => setAnnualGCI(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Marketing Budget %</Label>
              <span className="text-lg font-bold text-primary">{budgetPercent}%</span>
            </div>
            <Slider
              value={[budgetPercent]}
              onValueChange={(value) => setBudgetPercent(value[0])}
              min={5}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5% (Conservative)</span>
              <span>20% (Aggressive)</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Annual Budget</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(annualBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Budget</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(monthlyBudget)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="space-y-3">
          <Label>Suggested Allocation</Label>
          {allocations.map((item) => {
            const amount = annualBudget * (item.percent / 100);
            return (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.percent}%</span>
                  </div>
                  <p className="text-sm font-medium text-primary">{formatCurrency(amount)}/yr</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 p-3 bg-secondary/30 rounded-lg">
        💡 <strong>Tip:</strong> New agents should start at 15-20% to build brand awareness. Established agents with strong referral networks can operate at 5-10%.
      </p>
    </Card>
  );
}
