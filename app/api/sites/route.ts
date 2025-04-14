import { NextResponse } from "next/server";
import { createSite, fetchNetlify } from "@/lib/netlify-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "100";
    const searchTerm = searchParams.get("name") || "";
    const sortBy = searchParams.get("sort_by") || "updated_at";
    const orderBy = searchParams.get("order_by") || "desc";

    // Build the query string with all parameters
    const queryParams = new URLSearchParams({
      filter: "all",
      sort_by: sortBy,
      order_by: orderBy,
      page,
      per_page: perPage,
      ...(searchTerm ? { name: searchTerm } : {}),
    });

    // Fetch sites with pagination and search
    const { data: sitesResponse, headers } = await fetchNetlify(
      `/sites?${queryParams}`
    );

    // Get sites with their last deploys
    const sites = Array.isArray(sitesResponse)
      ? sitesResponse
      : [sitesResponse];
    const sitesWithDeploys = await Promise.all(
      sites.map(async (site: any) => {
        try {
          const { data: deploysResponse } = await fetchNetlify(
            `/sites/${site.id}/deploys?per_page=1`
          );
          const lastDeploy =
            Array.isArray(deploysResponse) && deploysResponse.length > 0
              ? deploysResponse[0]
              : null;
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

    // Create response with Link header
    const response = NextResponse.json(sitesWithDeploys);
    if (headers?.link) {
      response.headers.set("Link", headers.link);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, envVars } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: "Site name is required" },
        { status: 400 }
      );
    }
    const site = await createSite(name, envVars);
    return NextResponse.json(site);
  } catch (error: any) {
    console.error("Error creating site:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create site",
        details: error.response ? await error.response.text() : undefined,
      },
      { status: 500 }
    );
  }
}
