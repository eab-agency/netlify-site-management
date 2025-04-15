import { NextResponse } from "next/server";
import { getSiteDeploys, createBuild } from "@/lib/netlify-api";

export async function GET(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const per_page = Number.parseInt(searchParams.get("per_page") || "5");

    // Add other optional parameters from Netlify API
    const production = searchParams.get("production");
    const state = searchParams.get("state");
    const branch = searchParams.get("branch");

    const options = {
      ...(production !== null && { production: production === "true" }),
      ...(state && { state }),
      ...(branch && { branch }),
    };

    const deploys = await getSiteDeploys(siteId, page, per_page, options);

    return NextResponse.json(deploys);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params;
    const deploy = await createBuild(siteId);
    return NextResponse.json(deploy);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
