"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface EditSiteDialogProps {
  siteId: string;
  siteName: string;
  onUpdated?: () => void;
}

interface EnvVars {
  GATSBY_YOUVISIT_INSTID: string;
  GATSBY_LOCATIONS?: string;
  GATSBY_SHOWCODE?: string;
}

export function EditSiteDialog({
  siteId,
  siteName,
  onUpdated,
}: EditSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVars>({
    GATSBY_YOUVISIT_INSTID: "",
    GATSBY_LOCATIONS: "",
    GATSBY_SHOWCODE: "false",
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch current env vars when dialog opens
  const fetchEnvVars = async () => {
    if (!open) return;
    setLoading(true);
    try {
      // Fetch full site details first
      const siteResponse = await fetch(`/api/sites/${siteId}`);
      if (!siteResponse.ok) {
        const errorData = await siteResponse.json();
        throw new Error(errorData.error || "Failed to fetch site details");
      }
      const siteData = await siteResponse.json();

      // Fetch environment variables
      const response = await fetch(`/api/sites/${siteId}/env`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch environment variables"
        );
      }
      const data = await response.json();
      setEnvVars({
        GATSBY_YOUVISIT_INSTID: data.GATSBY_YOUVISIT_INSTID || "",
        GATSBY_LOCATIONS: data.GATSBY_LOCATIONS || "",
        GATSBY_SHOWCODE: data.GATSBY_SHOWCODE || "false",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch environment variables",
        variant: "destructive",
      });
      // Close the dialog on error
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchEnvVars when dialog opens
  useEffect(() => {
    if (open) {
      fetchEnvVars();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    if (!envVars.GATSBY_YOUVISIT_INSTID) {
      toast({
        title: "Error",
        description: "GATSBY_YOUVISIT_INSTID is required",
        variant: "destructive",
      });
      setUpdating(false);
      return;
    }

    try {
      const response = await fetch(`/api/sites/${siteId}/env`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          envVars: {
            GATSBY_YOUVISIT_INSTID: envVars.GATSBY_YOUVISIT_INSTID,
            ...(envVars.GATSBY_LOCATIONS
              ? { GATSBY_LOCATIONS: envVars.GATSBY_LOCATIONS }
              : {}),
            ...(envVars.GATSBY_SHOWCODE
              ? { GATSBY_SHOWCODE: envVars.GATSBY_SHOWCODE }
              : {}),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update environment variables"
        );
      }

      // Trigger a new deployment
      await fetch(`/api/sites/${siteId}/deploys`, {
        method: "POST",
      });

      setOpen(false);
      toast({
        title: "Site updated",
        description: `Environment variables for ${siteName} have been updated and a new deployment has been triggered.`,
      });

      if (onUpdated) {
        onUpdated();
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "An error occurred while updating the site",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Edit Site</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Site Environment Variables</DialogTitle>
            <DialogDescription>
              Update environment variables for {siteName}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-6">Loading environment variables...</div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="GATSBY_YOUVISIT_INSTID"
                    className="flex items-center gap-2"
                  >
                    YouVisit Institution ID
                    <span className="text-xs text-red-500">*required</span>
                  </Label>
                  <Input
                    id="GATSBY_YOUVISIT_INSTID"
                    value={envVars.GATSBY_YOUVISIT_INSTID}
                    onChange={(e) =>
                      setEnvVars({
                        ...envVars,
                        GATSBY_YOUVISIT_INSTID: e.target.value,
                      })
                    }
                    placeholder="Enter institution ID"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="GATSBY_LOCATIONS">YV Locations</Label>
                  <Input
                    id="GATSBY_LOCATIONS"
                    value={envVars.GATSBY_LOCATIONS}
                    onChange={(e) =>
                      setEnvVars({
                        ...envVars,
                        GATSBY_LOCATIONS: e.target.value,
                      })
                    }
                    placeholder="Enter locations (optional)"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="GATSBY_SHOWCODE"
                    checked={envVars.GATSBY_SHOWCODE === "true"}
                    onCheckedChange={(checked) =>
                      setEnvVars({
                        ...envVars,
                        GATSBY_SHOWCODE: checked ? "true" : "false",
                      })
                    }
                  />
                  <Label htmlFor="GATSBY_SHOWCODE">Show Code?</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating || loading}>
              {updating ? "Updating..." : "Update & Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
