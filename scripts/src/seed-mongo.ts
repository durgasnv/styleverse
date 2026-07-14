// Seeds MongoDB with the app's current product/hub/challenge data
// (hand-authored + the real ingested photos in ingested-products.ts).
// Safe to rerun — it replaces each collection's contents wholesale.
//
// Usage: MONGODB_URI=<connection string> pnpm --filter @workspace/scripts run seed-mongo

import { connectDB, ProductModel, HubModel, ChallengeModel } from "@workspace/db";
import { MOCK_PRODUCTS, MOCK_HUBS, MOCK_CHALLENGES } from "../../artifacts/styleverse/src/data/mock-data";

async function main() {
  await connectDB();

  await ProductModel.deleteMany({});
  await ProductModel.insertMany(MOCK_PRODUCTS);
  console.log(`seeded ${MOCK_PRODUCTS.length} products`);

  await HubModel.deleteMany({});
  await HubModel.insertMany(MOCK_HUBS);
  console.log(`seeded ${MOCK_HUBS.length} hubs`);

  await ChallengeModel.deleteMany({});
  await ChallengeModel.insertMany(MOCK_CHALLENGES);
  console.log(`seeded ${MOCK_CHALLENGES.length} challenges`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
