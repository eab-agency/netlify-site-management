import { NextResponse } from "next/server"
import { getActiveBuilds } from "@/lib/netlify-api"

export async function GET() {
  try {
    const builds = await getActiveBuilds()

    // Ensure we're returning an array
    const buildsArray = Array.isArray(builds) ? builds : []

    return NextResponse.json(buildsArray)
  } catch (error: any) {
    console.error("Error in builds API route:", error)
    return NextResponse.json({ error: error.message || "An unknown error occurred" }, { status: 500 })
  }
}
