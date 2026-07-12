import { describe, expect, it } from "vitest";
import {
  detectColumn,
  parseCsv,
  parseImportRows,
  parseWineType,
} from "../../src/utils/importWines";
import { WineType } from "../../src/types/index";

describe("detectColumn", () => {
  it("detects English headers case-insensitively", () => {
    const map = detectColumn(["Name", "PRODUCER", "Vintage", "Qty"]);
    expect(map.name).toBe(0);
    expect(map.producer).toBe(1);
    expect(map.vintage).toBe(2);
    expect(map.quantity).toBe(3);
    expect(map.region).toBeUndefined();
  });

  it("detects Hebrew headers", () => {
    const map = detectColumn(["שם יין", "יצרן", "בציר", "כמות", "מחיר"]);
    expect(map.name).toBe(0);
    expect(map.producer).toBe(1);
    expect(map.vintage).toBe(2);
    expect(map.quantity).toBe(3);
    expect(map.purchasePrice).toBe(4);
  });

  it("returns undefined for missing columns", () => {
    const map = detectColumn(["foo", "bar"]);
    expect(map.name).toBeUndefined();
  });
});

describe("parseWineType", () => {
  it("maps English and Hebrew aliases", () => {
    expect(parseWineType("Red")).toBe(WineType.Red);
    expect(parseWineType("אדום")).toBe(WineType.Red);
    expect(parseWineType("rose")).toBe(WineType.Rosé);
    expect(parseWineType("nonsense")).toBeUndefined();
    expect(parseWineType("")).toBeUndefined();
  });
});

describe("parseImportRows", () => {
  const colMap = detectColumn(["name", "type", "vintage", "quantity", "price"]);

  it("parses valid rows and skips nameless rows", () => {
    const rows = parseImportRows(
      [
        ["Margaux", "red", "2018", "3", "450"],
        ["", "white", "2020", "1", "80"],
        ["Chablis", "white", "not-a-year", "0", "-5"],
      ],
      colMap
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Margaux",
      type: WineType.Red,
      vintage: 2018,
      quantity: 3,
      purchasePrice: 450,
    });
    // Invalid vintage/quantity/price fall back sanely
    expect(rows[1]).toMatchObject({ name: "Chablis", vintage: undefined, quantity: 1 });
    expect(rows[1].purchasePrice).toBeUndefined();
  });

  it("rejects vintages before 1901", () => {
    const rows = parseImportRows([["Old", "", "1850", "", ""]], colMap);
    expect(rows[0].vintage).toBeUndefined();
  });
});

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('name,note\n"Château, Margaux","said ""wow"""')).toEqual([
      ["name", "note"],
      ['Château, Margaux', 'said "wow"'],
    ]);
  });

  it("handles CRLF and BOM", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops fully empty rows", () => {
    expect(parseCsv("a,b\n,\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
