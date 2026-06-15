import { z } from "zod";
import { defineTool } from "../utils/func-tool.js";
import { searchTwFood } from "../lib/qdrant.js";

async function search({ query, limit = 5 }) {
  return await searchTwFood(query, limit);
}

export const twFoodTool = defineTool({
  name: "search_tw_food",
  description:
    "在 tw_food 資料庫中以語意搜尋相關台灣美食，可用於查詢各縣市代表美食、知名店家、夜市小吃、伴手禮等資訊。",
  fn: search,
  parameters: z.object({
    query: z.string().describe("查詢內容，例如：台南有什麼有名的湯品？"),
    limit: z.number().default(5).describe("回傳筆數上限，預設 5"),
  }),
});