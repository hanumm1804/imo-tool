import { NextResponse } from 'next/server'

// PHASE_2_SWAP: Replace with full SharePoint Graph API implementation
// Requires: lib/graph.ts, Azure AD token, @microsoft/microsoft-graph-client

const DEMO_RESPONSE = NextResponse.json(
  { error: 'SharePoint integration not available in demo', code: 'DEMO_MODE' },
  { status: 501 }
)

export async function GET():    Promise<NextResponse> { return DEMO_RESPONSE }
export async function POST():   Promise<NextResponse> { return DEMO_RESPONSE }
export async function PUT():    Promise<NextResponse> { return DEMO_RESPONSE }
export async function DELETE(): Promise<NextResponse> { return DEMO_RESPONSE }
