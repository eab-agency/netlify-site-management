import { NextResponse } from "next/server";
import { getSitesWithLastDeploy, createSite } from "@/lib/netlify-api";

export async function GET() {
  try {
    const sites = await getSitesWithLastDeploy();

    // Ensure we're returning an array
    const sitesArray = Array.isArray(sites) ? sites : sites ? [sites] : [];

    return NextResponse.json(sitesArray);
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
