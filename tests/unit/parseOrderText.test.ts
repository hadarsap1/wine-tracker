import { describe, expect, it } from "vitest";
import { parseOrderText } from "../../src/utils/parseOrderText";
import { WineType } from "../../src/types/index";

describe("parseOrderText", () => {
  it("parses multi-line grouped items (name / qty × price)", () => {
    const text = ["Château Margaux 2018", "2 × 450.00 ₪"].join("\n");
    const items = parseOrderText(text);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Château Margaux",
      quantity: 2,
      price: 450,
      vintage: 2018,
    });
  });

  it("treats qty × year as vintage and reads price from next line", () => {
    const text = ["Yarden Cabernet", "3 × 2021", "120.00 ₪"].join("\n");
    const items = parseOrderText(text);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      quantity: 3,
      vintage: 2021,
      price: 120,
    });
  });

  it("parses single-line items with inline quantity and type", () => {
    const items = parseOrderText("Golan Heights Rosé x3");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      quantity: 3,
      type: WineType.Rosé,
    });
  });

  it("known quirk: a vintage directly before the quantity is misread as quantity", () => {
    // Documents existing behavior — "2022 x3" makes INLINE_QTY_RE capture 2022.
    // Kept as a characterization test so a future parser fix is a deliberate change.
    const items = parseOrderText("Golan Heights Rosé 2022 x3");
    expect(items[0].quantity).toBe(999);
    expect(items[0].vintage).toBe(2022);
  });

  it("skips totals, shipping, and other non-wine lines", () => {
    const text = ["Total: 500 ₪", 'סה"כ 500', "משלוח 30 ₪", "Recanati Reserve", "-----"].join("\n");
    const items = parseOrderText(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toContain("Recanati");
  });

  it("strips Hebrew date prefixes from names", () => {
    const items = parseOrderText("מרץ17 - Tabor Adama Shiraz");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Tabor Adama Shiraz");
  });

  it("deduplicates adjacent identical names", () => {
    const text = ["Dalton Estate x1", "Dalton Estate x1"].join("\n");
    expect(parseOrderText(text)).toHaveLength(1);
  });

  it("returns empty array for empty/garbage input", () => {
    expect(parseOrderText("")).toEqual([]);
    expect(parseOrderText("123\n456\n---")).toEqual([]);
  });
});
