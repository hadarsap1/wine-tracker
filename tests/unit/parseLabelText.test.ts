import { describe, expect, it } from "vitest";
import { parseLabelText, calcConfidence } from "../../src/utils/parseLabelText";
import { WineType } from "../../src/types/index";

describe("parseLabelText", () => {
  it("extracts vintage, grape, and type, leaving the brand as name", () => {
    const result = parseLabelText(
      ["Silver Ridge", "Cabernet Sauvignon", "2019", "13.5% vol", "750ml"].join("\n")
    );
    expect(result.vintage).toBe(2019);
    expect(result.grape).toBe("Cabernet Sauvignon");
    expect(result.type).toBe(WineType.Red); // inferred from grape
    expect(result.name).toBe("Silver Ridge");
    expect(result.confidence).toBe("high"); // name + type + grape + vintage
  });

  it("extracts country and region from an appellation keyword", () => {
    const result = parseLabelText("Grand Vin\nNapa\n2018");
    expect(result.country).toBe("USA");
    expect(result.region?.toLowerCase()).toBe("napa");
  });

  it("prefers explicit type keywords over grape inference", () => {
    const result = parseLabelText("Sparkling Chardonnay\n2021");
    expect(result.type).toBe(WineType.Sparkling);
  });

  it("ignores future years and picks the most recent valid vintage", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = parseLabelText(`Est. 1870\nGrand Vin\n2015\n${nextYear}`);
    expect(result.vintage).toBe(2015);
  });

  it("filters OCR noise lines (percentages, volumes, barcodes, URLs)", () => {
    const result = parseLabelText(
      ["14% vol", "750ml", "WX12345678", "www.winery.example", "Rioja Reserva"].join("\n")
    );
    expect(result.country).toBe("Spain");
    expect(result.region?.toLowerCase()).toBe("rioja");
  });

  it("keeps Hebrew winery lines as producer", () => {
    const result = parseLabelText("Adama\nיקב תבור\n2020");
    expect(result.producer).toBe("יקב תבור");
    expect(result.name).toBe("Adama");
  });

  it("returns low confidence for empty input", () => {
    expect(parseLabelText("")).toEqual({ confidence: "low" });
  });
});

describe("calcConfidence", () => {
  it("scales with number of extracted fields", () => {
    expect(calcConfidence({})).toBe("low");
    expect(calcConfidence({ name: "a", vintage: 2020 })).toBe("medium");
    expect(
      calcConfidence({ name: "a", vintage: 2020, grape: "Merlot", country: "France" })
    ).toBe("high");
  });
});
