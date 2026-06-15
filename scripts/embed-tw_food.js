import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { client } from "../lib/openai.js";
import {
  qdrant,
  TW_FOOD_COLLECTION,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
} from "../lib/qdrant.js";

const CSV_PATH = "data/tw_food.csv";
const BATCH_SIZE = 100;

function rowToText(row) {
  return [
    row.title,
    row.type,
    row.city,
    row.famous_shop,
    row.country,
    row.category,
    row.description,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function recreateCollection() {
  const exists = await qdrant.collectionExists(TW_FOOD_COLLECTION);
  if (exists.exists) {
    await qdrant.deleteCollection(TW_FOOD_COLLECTION);
  }

  await qdrant.createCollection(TW_FOOD_COLLECTION, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });
}

async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return res.data.map((d) => d.embedding);
}

async function main() {
  const csv = await readFile(CSV_PATH, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true });

  console.log(`讀到 ${rows.length} 筆台灣美食資料`);

  await recreateCollection();
  console.log(`已建立 collection: ${TW_FOOD_COLLECTION}`);

  let processed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map(rowToText);
    const vectors = await embedBatch(texts);

    const points = batch.map((row, idx) => ({
      id: i + idx,
      vector: vectors[idx],
      payload: {
        food_id: row.food_id,
        type: row.type,
        title: row.title,
        city: row.city,
        famous_shop: row.famous_shop,
        country: row.country,
        category: row.category,
        description: row.description,
      },
    }));

    await qdrant.upsert(TW_FOOD_COLLECTION, { wait: true, points });

    processed += batch.length;
    console.log(`進度：${processed} / ${rows.length}`);
  }

  console.log("台灣美食知識庫 Embedding 建立完成！");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
