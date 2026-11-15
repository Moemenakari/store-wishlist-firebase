// Fills the Firestore emulator with the product catalogue.
// The emulator REST API accepts the "owner" token and skips security rules for it.
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const project = process.env.GCLOUD_PROJECT ?? 'demo-cedar-market';
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents/products`;

const products = [
  { id: 'olive-oil', name: 'Olive Oil 750ml', category: 'Pantry', price: 12.5 },
  { id: 'zaatar', name: 'Zaatar Mix 250g', category: 'Pantry', price: 4.75 },
  { id: 'molasses', name: 'Pomegranate Molasses', category: 'Pantry', price: 6.2 },
  { id: 'coffee', name: 'Turkish Coffee 500g', category: 'Drinks', price: 9.9 },
  { id: 'rose-water', name: 'Rose Water 300ml', category: 'Drinks', price: 3.4 },
  { id: 'baklava', name: 'Baklava Box 12pc', category: 'Sweets', price: 15 },
];

for (const { id, name, category, price } of products) {
  const response = await fetch(`${base}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: { stringValue: name },
        category: { stringValue: category },
        price: { doubleValue: price },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Seeding ${id} failed: ${response.status} ${await response.text()}`);
  }
}
console.log(`Seeded ${products.length} products into ${project}.`);
