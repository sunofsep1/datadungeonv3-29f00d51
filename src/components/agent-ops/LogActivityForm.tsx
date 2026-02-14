import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertTodayActivity, useTodayActivity } from "@/hooks/useActivities";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save } from "lucide-react";

export function LogActivityForm() {
  const { data: todayActivity } = useTodayActivity();
  const upsertActivity = useUpsertTodayActivity();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    calls_made: 0,
    appointments_set: 0,
    listings_taken: 0,
    offers_written: 0,
    contracts_signed: 0,
    closings: 0,
    gci_earned: 0,
  });

  React.useEffect(() => {
    if (todayActivity) {
      setFormData({
        calls_made: todayActivity.calls_made || 0,
        appointments_set: todayActivity.appointments_set || 0,
        listings_taken: todayActivity.listings_taken || 0,
        offers_written: todayActivity.offers_written || 0,
        contracts_signed: todayActivity.contracts_signed || 0,
        closings: todayActivity.closings || 0,
        gci_earned: Number(todayActivity.gci_earned) || 0,
      });
    }
  }, [todayActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertActivity.mutateAsync(formData);
      toast({ title: "Success", description: "Today's activity saved!" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save activity", 
        variant: "destructive" 
      });
    }
  };

  const fields = [
    { key: "calls_made", label: "Calls Made" },
    { key: "appointments_set", label: "Appointments Set" },
    { key: "listings_taken", label: "Listings Taken" },
    { key: "offers_written", label: "Offers Written" },
    { key: "contracts_signed", label: "Contracts Signed" },
    { key: "closings", label: "Closings" },
    { key: "gci_earned", label: "GCI Earned ($)", isCurrency: true },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Log Today's Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-sm">{field.label}</Label>
                <Input
                  type="number"
                  min="0"
                  step={field.isCurrency ? "0.01" : "1"}
                  className="bg-input"
                  value={formData[field.key as keyof typeof formData] ?? ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    [field.key]: field.isCurrency ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0
                  })}
                />
              </div>
            ))}
          </div>
          <Button type="submit" disabled={upsertActivity.isPending} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {upsertActivity.isPending ? "Saving..." : "Save Today's Activity"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
