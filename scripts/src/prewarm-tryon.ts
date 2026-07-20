// Pre-generates virtual try-on results so the live demo never waits on (or
// gets a failure from) the image API. Run it with the api-server up:
//
//   pnpm --filter @workspace/scripts prewarm-tryon                  # all Women/Men products x all body types
//   pnpm --filter @workspace/scripts prewarm-tryon w1 w2            # only these product ids
//
// Results land in artifacts/styleverse/public/img/tryon/ via the API's own
// cache — commit them for demo insurance. API base overridable via API_BASE.
export {}; // top-level await requires this file to be a module

const API_BASE = process.env.API_BASE ?? "http://localhost:8080";
const BODY_TYPES = ["inverted-triangle", "apple", "hourglass", "pear", "rectangle"];

interface Product {
  id: string;
  name: string;
  category: string;
}

const onlyIds = process.argv.slice(2);

const productsResponse = await fetch(`${API_BASE}/api/products`);
if (!productsResponse.ok) {
  console.error(`Failed to list products (${productsResponse.status}) — is the api-server running?`);
  process.exit(1);
}
const products = ((await productsResponse.json()) as Product[]).filter(
  (p) =>
    (p.category === "Women" || p.category === "Men") &&
    (onlyIds.length === 0 || onlyIds.includes(p.id)),
);

console.log(`Pre-warming ${products.length} products x ${BODY_TYPES.length} body types...`);

let generated = 0;
let cached = 0;
let failed = 0;

for (const product of products) {
  for (const bodyType of BODY_TYPES) {
    const label = `${product.id} (${product.name}) x ${bodyType}`;
    try {
      const res = await fetch(`${API_BASE}/api/tryon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, bodyType }),
      });
      const body = (await res.json()) as { cached?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (body.cached) {
        cached++;
        console.log(`cached    ${label}`);
      } else {
        generated++;
        console.log(`generated ${label}`);
      }
    } catch (err) {
      failed++;
      console.error(`FAILED    ${label}: ${(err as Error).message}`);
    }
  }
}

console.log(`\nDone: ${generated} generated, ${cached} already cached, ${failed} failed.`);
if (failed > 0) process.exit(1);
