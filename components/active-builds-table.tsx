"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilds } from "@/lib/builds-context";
import Link from "next/link";
import { Cache } from "@/lib/cache";
import { isRateLimited } from "@/lib/utils";

const BUILDS_CACHE_KEY = "active-builds";
const REFRESH_INTERVAL = 10000; // 10 seconds

export default function ActiveBuildsTable() {
  const { builds, setBuilds, isLoaded, setIsLoaded } = useBuilds();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchBuilds = async () => {
    if (refreshing || isRateLimited("fetchBuilds", 2000)) return; // 2 second rate limit

    setRefreshing(true);
    setError(null);

    try {
      // Check cache first
      const cachedData = Cache.get(BUILDS_CACHE_KEY);
      if (cachedData) {
        setBuilds(cachedData);
        setIsLoaded(true);
        setRefreshing(false);
        return;
      }

      const response = await fetch("/api/builds");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch builds");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn("Expected array of builds, got:", data);
        setBuilds([]);
      } else {
        // Cache the results with a shorter TTL since builds change frequently
        Cache.set(BUILDS_CACHE_KEY, data, 30000); // 30 second cache
        setBuilds(data);
      }
      setIsLoaded(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching builds");
      console.error("Error fetching builds:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!isLoaded && !refreshing && !error) {
      fetchBuilds();
    }
  }, [isLoaded, refreshing, error]);

  // Auto-refresh every REFRESH_INTERVAL
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(fetchBuilds, REFRESH_INTERVAL);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  // Render skeleton loaders
  const renderSkeletonRows = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-4 w-[150px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[100px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[100px]" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[200px]" />
        </TableCell>
      </TableRow>
    ));
  };

  if (!isLoaded && !error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderSkeletonRows(5)}</TableBody>
          </Table>
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
            <Button onClick={fetchBuilds} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusLabel = (state: string) => {
    switch (state) {
      case "building":
        return "Building";
      case "enqueued":
        return "Enqueued";
      case "processing":
        return "Processing";
      case "uploading":
        return "Uploading";
      case "initializing":
        return "Initializing";
      default:
        return state;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBuilds}
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
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refreshing ? (
              renderSkeletonRows(builds.length || 5)
            ) : builds.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No active builds at the moment.
                </TableCell>
              </TableRow>
            ) : (
              builds.map((build) => (
                <TableRow key={build.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`https://app.netlify.com/sites/${build.site_name}/deploys/${build.id}`}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {build.site_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        build.state === "building" ? "default" : "secondary"
                      }
                    >
                      {getStatusLabel(build.state)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span title={new Date(build.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(build.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {build.state !== "enqueued" ? (
                      <div className="w-full max-w-xs">
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${build.progress || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {build.progress
                            ? `${build.progress}%`
                            : "In progress"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Waiting to start
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
