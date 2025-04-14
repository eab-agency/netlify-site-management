import ActiveBuildsTable from "@/components/active-builds-table"

export default function BuildsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Active Builds</h1>
      </div>

      <ActiveBuildsTable />
    </div>
  )
}
