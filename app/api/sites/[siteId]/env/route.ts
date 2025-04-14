import { NextRequest } from "next/server";
import { fetchNetlify } from "@/lib/netlify-api";

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const accountSlug = process.env.NETLIFY_ACCOUNT_SLUG;
    if (!accountSlug) {
      throw new Error("NETLIFY_ACCOUNT_SLUG environment variable is not set");
    }

    const response = await fetchNetlify(
      `/accounts/${accountSlug}/env?site_id=${params.siteId}`
    );

    // Convert Netlify's env var format to a simple key-value object
    const envVars = Array.isArray(response)
      ? response.reduce((acc: Record<string, string>, env: any) => {
          if (env.values && env.values.length > 0) {
            acc[env.key] = env.values[0].value;
          }
          return acc;
        }, {})
      : {};

    return Response.json(envVars);
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to fetch environment variables" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { envVars } = body;
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

    // Update env vars
    const response = await fetchNetlify(
      `/accounts/${accountSlug}/env?site_id=${params.siteId}`,
      {
        method: "POST",
        body: JSON.stringify(envVarArray),
      }
    );

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to update environment variables" },
      { status: 500 }
    );
  }
}
