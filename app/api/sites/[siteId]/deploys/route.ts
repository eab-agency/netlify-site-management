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
    const perPage = Number.parseInt(searchParams.get("perPage") || "5");

    const deploys = await getSiteDeploys(siteId, page, perPage);
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
