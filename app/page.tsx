import SitesTable from "@/components/sites-table";
import { Input } from "@/components/ui/input";
import { CreateSiteButton } from "@/components/create-site-button";

export default function SitesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Partner & Proofer Sites
        </h1>
        <CreateSiteButton />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Search sites..."
            className="w-full"
            type="search"
          />
        </div>
      </div>

      <SitesTable />
    </div>
  );
}
