"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RefreshCw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DeleteSiteDialog } from "@/components/delete-site-dialog";
import { DeploysDialog } from "@/components/deploys-dialog";
import { EditSiteDialog } from "@/components/edit-site-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { isRateLimited } from "@/lib/utils";

interface Deploy {
  id: string;
  state: string;
  created_at: string;
  published_at?: string;
  deploy_time?: number;
  branch?: string;
  commit_ref?: string;
  commit_message?: string;
  title?: string;
  context?: string;
  error_message?: string;
}

interface Site {
  id: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
  ssl_url: string;
  state: string;
  screenshot_url?: string;
  account_name?: string;
  account_slug?: string;
  lastDeploy: Deploy | null;
  last_deploy_time: string | null;
}

const rateLimiters = new Map<string, number>();

export default function SitesTable() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "last_deploy_time">(
    "last_deploy_time"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [redeployingSites, setRedeployingSites] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const sitesPerPage = 20;

  const fetchSites = async () => {
    if (refreshing || isRateLimited("fetchSites")) return;

    setRefreshing(true);
    if (!loading) setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sites");

      if (!response.ok) {
        // If we hit the rate limit, wait longer before allowing next request
        if (response.status === 429) {
          rateLimiters.set("fetchSites", Date.now() + 60000); // Wait 1 minute
          throw new Error(
            "API rate limit reached. Please wait a moment before refreshing."
          );
        }

        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch sites");
      }

      const data = await response.json();

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn("Expected array of sites, got:", data);

        // If it's a single object with site properties, wrap it in an array
        if (data && typeof data === "object" && data.id) {
          setSites([data]);
        } else {
          setSites([]);
        }
      } else {
        setSites(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching sites");
      console.error("Error fetching sites:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Sort sites
  const sortedSites = [...sites].sort((a, b) => {
    if (sortField === "name") {
      return sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      // For last_deploy_time, handle null values
      if (!a.last_deploy_time && !b.last_deploy_time) return 0;
      if (!a.last_deploy_time) return sortDirection === "asc" ? -1 : 1;
      if (!b.last_deploy_time) return sortDirection === "asc" ? 1 : -1;

      const dateA = new Date(a.last_deploy_time).getTime();
      const dateB = new Date(b.last_deploy_time).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    }
  });

  // Filter sites by search term and partner/proof requirement
  const filteredSites = sortedSites.filter((site) => {
    const siteName = site.name.toLowerCase();
    const searchMatch = siteName.includes(searchTerm.toLowerCase());
    const isPartnerOrProof = siteName.includes('partner') || siteName.includes('proof');
    return searchMatch && isPartnerOrProof;
  });

  // Paginate sites
  const paginatedSites = filteredSites.slice(
    (currentPage - 1) * sitesPerPage,
    currentPage * sitesPerPage
  );

  const totalPages = Math.ceil(filteredSites.length / sitesPerPage);

  const handleSort = (field: "name" | "last_deploy_time") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleRedeploy = async (siteId: string) => {
    setRedeployingSites((prev) => [...prev, siteId]);

    try {
      const response = await fetch(`/api/sites/${siteId}/deploys`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redeploy site");
      }

      toast({
        title: "Site redeployed",
        description:
          "Your site is being redeployed. This may take a few minutes.",
      });

      // Refresh the sites list after a short delay to show the new deploy
      setTimeout(() => {
        fetchSites();
      }, 3000);
    } catch (err: any) {
      toast({
        title: "Redeploy failed",
        description:
          err.message || "An error occurred while redeploying the site",
        variant: "destructive",
      });
    } finally {
      setRedeployingSites((prev) => prev.filter((id) => id !== siteId));
    }
  };

  const handleSiteDeleted = (siteId: string) => {
    setSites((prev) => prev.filter((site) => site.id !== siteId));
  };

  // Update search input in parent component
  useEffect(() => {
    const searchInput = document.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => handleSearch(e as any));
    }

    return () => {
      if (searchInput) {
        searchInput.removeEventListener("input", (e) => handleSearch(e as any));
      }
    };
  }, []);

  // Render skeleton loaders
  const renderSkeletonRows = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-4 w-[150px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[200px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[100px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[80px]" />
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  if (loading && !refreshing) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Last Deployed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderSkeletonRows(5)}</TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-2">
            <Button onClick={fetchSites} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSites}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  className="p-0 font-bold flex items-center gap-1"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortField === "name" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>URL</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="p-0 font-bold flex items-center gap-1"
                  onClick={() => handleSort("last_deploy_time")}
                >
                  Last Deployed
                  {sortField === "last_deploy_time" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refreshing ? (
              renderSkeletonRows(paginatedSites.length || 5)
            ) : paginatedSites.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No sites found. {searchTerm && "Try a different search term."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`https://app.netlify.com/sites/${site.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      {site.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={site.ssl_url || site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      {(site.ssl_url || site.url).replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    {site.last_deploy_time ? (
                      <span
                        title={new Date(site.last_deploy_time).toLocaleString()}
                      >
                        {formatDistanceToNow(new Date(site.last_deploy_time), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Never deployed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {/* <Badge
                        variant={site.state === "ready" ? "success" : "default"}
                      >
                        {site.state === "ready" ? "Ready" : site.state}
                      </Badge> */}
                      {site.lastDeploy && (
                        <Badge
                          variant={
                            site.lastDeploy.state === "ready"
                              ? "success"
                              : site.lastDeploy.state === "error"
                              ? "destructive"
                              : site.lastDeploy.state === "building"
                              ? "default"
                              : "default"
                          }
                        >
                          {site.lastDeploy.state === "ready"
                            ? "Build Success"
                            : site.lastDeploy.state === "error"
                            ? "Build Failed"
                            : site.lastDeploy.state === "building"
                            ? "Building"
                            : site.lastDeploy.state}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditSiteDialog
                        siteId={site.id}
                        siteName={site.name}
                        onUpdated={fetchSites}
                      />

                      <DeploysDialog siteId={site.id} siteName={site.name} />

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRedeploy(site.id)}
                        disabled={redeployingSites.includes(site.id)}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            redeployingSites.includes(site.id)
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        <span className="sr-only">Redeploy</span>
                      </Button>

                      <DeleteSiteDialog
                        siteId={site.id}
                        siteName={site.name}
                        onDeleted={handleSiteDeleted}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {refreshing ? (
            <Skeleton className="h-4 w-[200px]" />
          ) : (
            <>
              Showing{" "}
              {paginatedSites.length > 0
                ? (currentPage - 1) * sitesPerPage + 1
                : 0}{" "}
              to {Math.min(currentPage * sitesPerPage, filteredSites.length)} of{" "}
              {filteredSites.length} sites
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? (
            <>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
