const UNSPLASH_ACCESS_KEY = "wyfEoQqwwyuLgal4zVO3IS7owMOfE4y4F15ivvcu_3I";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const type = url.searchParams.get("type") || "photos"; // photos or videos
  const page = url.searchParams.get("page") || "1";
  const perPage = url.searchParams.get("per_page") || "20";

  if (!query) {
    return new Response(JSON.stringify({ error: "Query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (type === "photos") {
      // Search Unsplash for photos
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query
        )}&page=${page}&per_page=${perPage}&client_id=${UNSPLASH_ACCESS_KEY}`,
        {
          headers: {
            "Accept-Version": "v1",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else if (type === "videos") {
      // For videos, we'll use Pexels API (free alternative)
      // Note: Unsplash doesn't have a video API, so we use Pexels
      // Get your free API key from: https://www.pexels.com/api/
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "YOUR_PEXELS_API_KEY_HERE";
      
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(
          query
        )}&page=${page}&per_page=${perPage}`,
        {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ results: data.videos || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Media search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to search media" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function action() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}