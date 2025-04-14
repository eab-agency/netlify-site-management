"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle } from "lucide-react";

interface DeploysDialogProps {
  siteId: string;
  siteName: string;
}

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

export function DeploysDialog({ siteId, siteName }: DeploysDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [cancelingDeploys, setCancelingDeploys] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchDeploys();
    }
  }, [open, siteId]);

  const fetchDeploys = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/deploys?perPage=5`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch deploys");
      }

      const data = await response.json();
      setDeploys(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching deploys");
      console.error("Error fetching deploys:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (deployId: string) => {
    try {
      setCancelingDeploys((prev) => [...prev, deployId]);

      const response = await fetch(
        `/api/sites/${siteId}/deploys/${deployId}/cancel`,
        {
          method: "POST",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel deploy");
      }

      // Refetch deploys after successful cancellation
      await fetchDeploys();
    } catch (err: any) {
      setError(err.message);
      console.error("Error canceling deploy:", err);
    } finally {
      setCancelingDeploys((prev) => prev.filter((id) => id !== deployId));
    }
  };

  const canCancel = (state: string) => {
    return state === "building" || state === "enqueued" || state === "new";
  };

  const getDeployStatus = (state: string) => {
    switch (state) {
      case "ready":
        return { label: "Success", variant: "success" as const };
      case "error":
        return { label: "Failed", variant: "destructive" as const };
      case "building":
        return { label: "Building", variant: "default" as const };
      case "enqueued":
        return { label: "Enqueued", variant: "secondary" as const };
      case "canceled":
        return { label: "Canceled", variant: "outline" as const };
      default:
        return { label: state, variant: "outline" as const };
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Clock className="h-4 w-4" />
          <span className="sr-only">Deploys</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Recent Deploys</DialogTitle>
          <DialogDescription>Last 5 deploys for {siteName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : deploys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deploys found for this site.
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {deploys.map((deploy) => {
              const status = getDeployStatus(deploy.state);
              return (
                <div
                  key={deploy.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      <span>
                        {deploy.title || deploy.commit_message || "Deploy"}
                      </span>
                      {deploy.branch && (
                        <Badge variant="outline" className="text-xs">
                          {deploy.branch}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {deploy.published_at ? (
                        <>
                          Deployed{" "}
                          {formatDistanceToNow(new Date(deploy.published_at), {
                            addSuffix: true,
                          })}
                        </>
                      ) : (
                        <>
                          Created{" "}
                          {formatDistanceToNow(new Date(deploy.created_at), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                      {deploy.deploy_time && (
                        <> • {(deploy.deploy_time / 1000).toFixed(0)}s</>
                      )}
                    </div>
                    {deploy.error_message && (
                      <div className="text-sm text-destructive mt-1">
                        {deploy.error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {canCancel(deploy.state) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancel(deploy.id)}
                        disabled={cancelingDeploys.includes(deploy.id)}
                      >
                        <XCircle
                          className={`h-4 w-4 ${
                            cancelingDeploys.includes(deploy.id)
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        <span className="sr-only">Cancel deploy</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
