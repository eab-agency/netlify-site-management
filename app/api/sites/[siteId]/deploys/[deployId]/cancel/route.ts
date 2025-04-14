import { NextResponse } from "next/server";
import { cancelDeploy } from "@/lib/netlify-api";

export async function POST(
  request: Request,
  { params }: { params: { siteId: string; deployId: string } }
) {
  try {
    const { siteId, deployId } = await params;

    await cancelDeploy(siteId, deployId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If the error contains a 404 status, return a more specific error message
    if (error.message?.includes("404")) {
      return NextResponse.json(
        {
          error:
            "Deploy not found or cannot be cancelled. The deploy may have already completed or is in a state that cannot be cancelled.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
