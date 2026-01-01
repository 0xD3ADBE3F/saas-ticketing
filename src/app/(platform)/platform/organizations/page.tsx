import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

export default function OrganizationsPage() {
  return (
    <div>
      <PageHeader title="Organizations" />
      <EmptyState
        icon={Building2}
        title="Organizations management"
        description="Organizations management coming soon... This will include organization listing, search, filtering, and management actions"
      />
    </div>
  );
}
