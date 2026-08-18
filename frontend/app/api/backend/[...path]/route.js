import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  return proxyRequest(request, params, "GET");
}

export async function POST(request, { params }) {
  return proxyRequest(request, params, "POST");
}

export async function PUT(request, { params }) {
  return proxyRequest(request, params, "PUT");
}

export async function DELETE(request, { params }) {
  return proxyRequest(request, params, "DELETE");
}

async function proxyRequest(request, params, method) {
  // 1. Verify NextAuth Session
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  // 2. Construct Backend URL
  const path = params.path.join("/");
  const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
  const url = new URL(`${backendUrl}/api/${path}`);
  url.search = request.nextUrl.search; // Forward query params (e.g. ?limit=40)

  // 3. Inject Security Headers
  const headers = new Headers(request.headers);
  headers.set("x-internal-api-key", process.env.INTERNAL_API_KEY || "dev-internal-key-123");
  headers.set("x-user-email", session.user.email);
  
  // Clean up host header so the backend doesn't get confused
  headers.delete("host");
  headers.delete("connection");

  // 4. Forward Request
  try {
    const fetchOptions = {
      method,
      headers,
    };
    
    // Only parse body if it's not a GET/HEAD
    if (method !== "GET" && method !== "HEAD") {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(url.toString(), fetchOptions);
    
    // 5. Return Response
    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error(`Proxy Error to ${url}:`, error);
    return NextResponse.json({ detail: "Backend connection failed" }, { status: 502 });
  }
}
