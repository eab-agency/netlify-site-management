"use client";

import type React from "react";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EnvVars {
  GATSBY_YOUVISIT_INSTID: string;
  GATSBY_LOCATIONS?: string;
  GATSBY_SHOWCODE?: string;
}

export function CreateSiteButton() {
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [envVars, setEnvVars] = useState<EnvVars>({
    GATSBY_YOUVISIT_INSTID: "",
    GATSBY_LOCATIONS: "",
    GATSBY_SHOWCODE: "false"
  });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedName = siteName.toLowerCase().trim();
    if (!sanitizedName) {
      toast({
        title: "Error",
        description: "Site name is required",
        variant: "destructive",
      });
      return;
    }

    if (!sanitizedName.match(/^[a-z0-9-]+$/)) {
      toast({
        title: "Invalid site name",
        description:
          "Site name can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (!envVars.GATSBY_YOUVISIT_INSTID) {
      toast({
        title: "Error",
        description: "GATSBY_YOUVISIT_INSTID is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    // Create clean env vars object without empty values
    const envVarsObject: Record<string, string> = {
      GATSBY_YOUVISIT_INSTID: envVars.GATSBY_YOUVISIT_INSTID,
      ...(envVars.GATSBY_LOCATIONS ? { GATSBY_LOCATIONS: envVars.GATSBY_LOCATIONS } : {}),
      ...(envVars.GATSBY_SHOWCODE ? { GATSBY_SHOWCODE: envVars.GATSBY_SHOWCODE } : {}),
    };

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: siteName,
          envVars: envVarsObject,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create site");
      }

      const data = await response.json();

      setCreating(false);
      setOpen(false);

      // Reset form
      setSiteName("");
      setEnvVars({
        GATSBY_YOUVISIT_INSTID: "",
        GATSBY_LOCATIONS: "",
        GATSBY_SHOWCODE: "false"
      });

      toast({
        title: "Site created",
        description: `${siteName} has been created successfully.`,
      });

      // Refresh the sites list
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err.message || "An error occurred while creating the site",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setSiteName("");
    setEnvVars({
      GATSBY_YOUVISIT_INSTID: "",
      GATSBY_LOCATIONS: "",
      GATSBY_SHOWCODE: "false"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          <span>Create Site</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Site</DialogTitle>
            <DialogDescription>
              Create a new Netlify site with environment variables.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="my-awesome-site"
                required
              />
              <p className="text-xs text-muted-foreground">
                Site names can only contain lowercase letters, numbers, and hyphens
              </p>
            </div>

            <div className="space-y-4">
              <Label>Environment Variables</Label>
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="GATSBY_YOUVISIT_INSTID" className="flex items-center gap-2">
                    GATSBY_YOUVISIT_INSTID
                    <span className="text-xs text-red-500">*required</span>
                  </Label>
                  <Input
                    id="GATSBY_YOUVISIT_INSTID"
                    value={envVars.GATSBY_YOUVISIT_INSTID}
                    onChange={(e) => setEnvVars({ ...envVars, GATSBY_YOUVISIT_INSTID: e.target.value })}
                    placeholder="Enter institution ID"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="GATSBY_LOCATIONS">GATSBY_LOCATIONS</Label>
                  <Input
                    id="GATSBY_LOCATIONS"
                    value={envVars.GATSBY_LOCATIONS}
                    onChange={(e) => setEnvVars({ ...envVars, GATSBY_LOCATIONS: e.target.value })}
                    placeholder="Enter locations (optional)"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="GATSBY_SHOWCODE">GATSBY_SHOWCODE</Label>
                  <Select
                    value={envVars.GATSBY_SHOWCODE}
                    onValueChange={(value) => setEnvVars({ ...envVars, GATSBY_SHOWCODE: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
