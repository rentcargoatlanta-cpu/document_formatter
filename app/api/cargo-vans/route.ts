import type { CargoVanApiResponse, CargoVan } from "@/lib/cargo-vans/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      "https://app.cargoatlanta.com/api/general/cargo-vans/all"
    );

    if (!response.ok) {
      return Response.json(
        { error: `Upstream API returned ${response.status}` },
        { status: 502 }
      );
    }

    const body: CargoVanApiResponse = await response.json();

    if (!body.success || !Array.isArray(body.data)) {
      return Response.json(
        { error: body.message ?? "Upstream API returned unsuccessful response" },
        { status: 502 }
      );
    }

    const vans: CargoVan[] = body.data.map((item) => ({
      id: item.id,
      make: item.make,
      model: item.model,
      year: item.year,
      color: item.color,
    }));

    return Response.json(vans);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error contacting upstream";
    return Response.json({ error: message }, { status: 502 });
  }
}
