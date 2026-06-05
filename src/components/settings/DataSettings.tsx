import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download } from "lucide-react";
import { LeadCsvImportBlock } from "@/components/settings/LeadCsvImportBlock";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { useContacts } from "@/hooks/useContacts";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useListings } from "@/hooks/useListings";
import { downloadCsv } from "@/lib/downloadCsv";
import { toast } from "sonner";

export function DataSettings() {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: listings = [], isLoading: listingsLoading } = useListings();

  const exportContacts = () => {
    if (!contacts.length) {
      toast.error("No contacts to export");
      return;
    }
    downloadCsv(
      `contacts-${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Name", "Email", "Phone", "Category", "Source", "Created"],
      contacts.map((c) => [
        c.name ?? "",
        c.email ?? "",
        c.phone ?? c.mobile ?? c.home_phone ?? "",
        c.contact_category ?? c.category ?? "",
        c.source ?? "",
        c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd") : "",
      ]),
    );
    toast.success(`Exported ${contacts.length} contacts`);
  };

  const exportProperties = () => {
    if (!properties.length) {
      toast.error("No properties to export");
      return;
    }
    downloadCsv(
      `properties-${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Address", "Suburb", "State", "Postcode", "Type", "Created"],
      properties.map((p) => [
        formatPropertyAddress(p),
        p.suburb ?? p.city ?? "",
        p.state ?? "",
        p.postcode ?? "",
        p.property_type ?? "",
        p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "",
      ]),
    );
    toast.success(`Exported ${properties.length} properties`);
  };

  const exportListings = () => {
    if (!listings.length) {
      toast.error("No listings to export");
      return;
    }
    downloadCsv(
      `listings-${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Address", "Status", "Price", "Pipeline stage", "Created"],
      listings.map((l) => [
        l.address ?? "",
        l.status ?? "",
        l.price != null ? String(l.price) : l.display_price ?? "",
        l.pipeline_stage ?? "",
        l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd") : "",
      ]),
    );
    toast.success(`Exported ${listings.length} listings`);
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Data Management"
        description="Import contacts and export your CRM data."
        icon={Database}
      />

      <LeadCsvImportBlock />

      <Card id="export-data" className="zoho-card p-6 border-border space-y-4 scroll-mt-24">
        <h3 className="font-semibold text-foreground">Export</h3>
        <p className="text-xs text-muted-foreground">Download a CSV snapshot of your current data.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={exportContacts} disabled={contactsLoading}>
            <Download className="h-3.5 w-3.5" />
            Export contacts
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={exportProperties} disabled={propertiesLoading}>
            <Download className="h-3.5 w-3.5" />
            Export properties
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={exportListings} disabled={listingsLoading}>
            <Download className="h-3.5 w-3.5" />
            Export listings
          </Button>
        </div>
      </Card>

      <Card className="zoho-card p-6 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground">Data health</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Database completeness score, duplicate clusters, and fixable queues.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/data-health">Open Data Health</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
