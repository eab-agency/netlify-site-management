// Netlify API utilities

// Base URL for Netlify API
const NETLIFY_API_URL = "https://api.netlify.com/api/v1";

// Helper function to make authenticated API requests
export async function fetchNetlify(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = process.env.NETLIFY_TOKEN;

  if (!token) {
    throw new Error("Netlify token is not available");
  }

  const url = `${NETLIFY_API_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Netlify API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        errorData.message ||
          JSON.stringify(errorData) ||
          `Netlify API request failed: ${response.status} ${response.statusText}`
      );
    }

    // For DELETE operations that return 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const responseData = await response.json();
    // If it's a delete operation and we got a success response with code 0
    if (options.method === "DELETE" && responseData.code === 0) {
      return { success: true, message: responseData.message };
    }

    // Return both the response data and headers
    return {
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error: any) {
    // Handle different types of network errors
    if (error instanceof TypeError) {
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("network") ||
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          `Unable to connect to Netlify API. Please check your internet connection and ensure you can access ${NETLIFY_API_URL}`
        );
      }
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error(
        `Connection to Netlify API failed. Please check your internet connection and proxy settings.`
      );
    }

    // If it's our error from response.ok check, throw it as is
    if (error.message.includes("Netlify API request failed")) {
      throw error;
    }

    // For any other unexpected errors
    console.error("Unexpected error when calling Netlify API:", error);
    throw new Error(
      `Unexpected error when calling Netlify API: ${error.message}`
    );
  }
}

// Get all sites with their last deploy
export async function getSitesWithLastDeploy() {
  const response = await fetchNetlify("/sites");
  const sitesResponse = response.data;

  // Ensure sites is an array
  const sites = Array.isArray(sitesResponse)
    ? sitesResponse
    : sitesResponse &&
      typeof sitesResponse === "object" &&
      "id" in sitesResponse
    ? [sitesResponse]
    : [];

  if (sites.length === 0) {
    console.warn(
      "No sites found or unexpected response format:",
      sitesResponse
    );
    return [];
  }

  // For each site, get the last deploy
  const sitesWithLastDeploy = await Promise.all(
    sites.map(async (site: any) => {
      try {
        const response = await fetchNetlify(
          `/sites/${site.id}/deploys?per_page=1`
        );
        const deploysResponse = response.data;

        // Ensure deploys is an array
        const deploys = Array.isArray(deploysResponse)
          ? deploysResponse
          : deploysResponse &&
            typeof deploysResponse === "object" &&
            "id" in deploysResponse
          ? [deploysResponse]
          : [];

        const lastDeploy = deploys.length > 0 ? deploys[0] : null;

        return {
          ...site,
          lastDeploy,
          last_deploy_time: lastDeploy ? lastDeploy.created_at : null,
        };
      } catch (error) {
        console.error(`Error fetching deploys for site ${site.id}:`, error);
        return {
          ...site,
          lastDeploy: null,
          last_deploy_time: null,
        };
      }
    })
  );

  return sitesWithLastDeploy;
}

// Get a specific site
export async function getSite(siteId: string) {
  return fetchNetlify(`/sites/${siteId}`);
}

// Create a deploy key
export async function createDeployKey() {
  return fetchNetlify("/deploy_keys", {
    method: "POST",
  });
}

// Create a new site
export async function createSite(
  name: string,
  envVars: Record<string, string> = {}
) {
  const siteData = {
    name,
    build_image: "noble",
    build_settings: {
      branch: "main",
      allowed_branches: [],
      skip_prs: true,
      installation_id: 12392279,
      stop_builds: true,
    },
    repo: {
      branch: "main",
      cmd: "gatsby build",
      dir: "/",
      private: false,
      provider: "github",
      repo: "eab-agency/iwc-default-proof",
      repo_id: 310384845,
      installation_id: 12392279,
      stop_builds: true,
    },
  };

  // Create the site
  const siteResponse = await fetchNetlify("/sites", {
    method: "POST",
    body: JSON.stringify(siteData),
  });

  if (!siteResponse || !("data" in siteResponse) || !siteResponse.data.id) {
    throw new Error(
      "Failed to create site or site ID is missing in the response"
    );
  }

  const site = siteResponse.data;

  // If we have environment variables, set them
  if (Object.keys(envVars).length > 0) {
    const accountSlug = process.env.NETLIFY_ACCOUNT_SLUG;
    if (!accountSlug) {
      throw new Error("NETLIFY_ACCOUNT_SLUG environment variable is not set");
    }

    // Format env vars according to API spec
    const envVarArray = Object.entries(envVars).map(([key, value]) => ({
      key,
      values: [{ value, context: "all" }],
      scopes: ["builds", "runtime", "post-processing"],
    }));

    await fetchNetlify(`/accounts/${accountSlug}/env?site_id=${site.id}`, {
      method: "POST",
      body: JSON.stringify(envVarArray),
    });
  }

  return site;
}

// Update site environment variables
export async function updateSiteEnvVars(
  siteId: string,
  envVars: Record<string, string>
) {
  return fetchNetlify(`/sites/${siteId}/env`, {
    method: "PATCH",
    body: JSON.stringify(envVars),
  });
}

// Delete a site
export async function deleteSite(siteId: string) {
  return fetchNetlify(`/sites/${siteId}`, {
    method: "DELETE",
  });
}

// Get deploys for a site
export async function getSiteDeploys(
  siteId: string,
  page = 1,
  per_page = 5,
  options: {
    production?: boolean;
    state?: string;
    branch?: string;
  } = {}
) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    ...(options.production !== undefined
      ? { production: options.production.toString() }
      : {}),
    ...(options.state ? { state: options.state } : {}),
    ...(options.branch ? { branch: options.branch } : {}),
  });

  const endpoint = `/sites/${siteId}/deploys?${params}`;

  const response = await fetchNetlify(endpoint);

  return response.data;
}

// Create a new deploy (redeploy)
export async function createBuild(siteId: string) {
  return fetchNetlify(`/sites/${siteId}/builds`, {
    method: "POST",
  });
}

// Cancel a deploy
export async function cancelDeploy(siteId: string, deployId: string) {
  return fetchNetlify(`/deploys/${deployId}/cancel`, {
    method: "POST",
  });
}

// Get all active builds across all sites
export async function getActiveBuilds() {
  try {
    // First, get all sites
    const sitesResponse = await fetchNetlify("/sites");

    // Ensure sites is an array
    const sites = Array.isArray(sitesResponse)
      ? sitesResponse
      : sitesResponse &&
        typeof sitesResponse === "object" &&
        "data" in sitesResponse &&
        sitesResponse.data.id
      ? [sitesResponse]
      : [];

    if (sites.length === 0) {
      console.warn(
        "No sites found or unexpected response format:",
        sitesResponse
      );
      return [];
    }

    // For each site, get in-progress deploys
    const activeBuildsPromises = sites.map(async (site: any) => {
      try {
        // Get all deploys for the site
        const response = await fetchNetlify(`/sites/${site.id}/deploys`);

        // Ensure we have an array of deploys
        let deploysArray: any[] = [];

        if (Array.isArray(response)) {
          deploysArray = response;
        } else if (response && typeof response === "object") {
          // If it's a single object with an id, wrap it in an array
          if (response && typeof response === "object" && "id" in response) {
            deploysArray = [response];
          } else {
            console.log(
              `Unexpected response format for site ${site.id}:`,
              response
            );
          }
        } else {
          console.log(
            `Unexpected response format for site ${site.id}:`,
            response
          );
          return [];
        }

        // Filter to only include active deploys (building or enqueued)
        const activeBuilds = deploysArray
          .filter((deploy: any) => {
            return (
              deploy &&
              typeof deploy === "object" &&
              (deploy.state === "building" ||
                deploy.state === "enqueued" ||
                deploy.state === "processing" ||
                deploy.state === "uploading" ||
                deploy.state === "initializing")
            );
          })
          .map((deploy: any) => ({
            ...deploy,
            site_id: site.id,
            site_name: site.name,
            // Calculate progress based on state
            progress:
              deploy.state === "building"
                ? Math.floor(Math.random() * 70) + 30 // Random progress for building (30-100%)
                : deploy.state === "initializing"
                ? 10
                : deploy.state === "processing"
                ? 50
                : deploy.state === "uploading"
                ? 80
                : 0, // 0% for enqueued
          }));

        return activeBuilds;
      } catch (error) {
        console.error(`Error fetching deploys for site ${site.id}:`, error);
        return [];
      }
    });

    // Wait for all promises to resolve and flatten the array
    const allActiveBuilds = (await Promise.all(activeBuildsPromises)).flat();

    return allActiveBuilds;
  } catch (error) {
    console.error("Error in getActiveBuilds:", error);
    return [];
  }
}
