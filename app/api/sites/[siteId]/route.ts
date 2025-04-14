import { NextResponse } from "next/server";
import { getSite, deleteSite } from "@/lib/netlify-api";

export async function GET(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params;
    const site = await getSite(siteId);
    return NextResponse.json(site);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params;
    await deleteSite(siteId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
