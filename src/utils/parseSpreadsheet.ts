import { parseCsv } from "./importWines";

/**
 * Reads the first sheet of an .xlsx file (via exceljs) or a .csv file into a
 * 2-D array of cell values. Web-only (used by the Excel import screen).
 *
 * exceljs replaced the unmaintained `xlsx` package, which had unfixed
 * prototype-pollution and ReDoS advisories while parsing user-supplied files.
 * Note: legacy .xls (BIFF) is no longer supported — save as .xlsx or .csv.
 */
export async function parseSpreadsheetFile(
  data: ArrayBuffer,
  fileName: string
): Promise<unknown[][]> {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return parseCsv(new TextDecoder("utf-8").decode(data));
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    // row.eachCell is 1-based; includeEmpty keeps column positions aligned.
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = normalizeCellValue(cell.value);
    });
    rows.push(values);
  });
  return rows;
}

/** Flattens exceljs cell values (rich text, formulas, hyperlinks, dates) to primitives. */
function normalizeCellValue(value: unknown): unknown {
  if (value == null) return "";
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((r) => r.text).join("");
    }
    if (v.result !== undefined) return normalizeCellValue(v.result); // formula
    if (v.text !== undefined) return normalizeCellValue(v.text); // hyperlink
    if (value instanceof Date) return value.getFullYear() > 1900 ? value.getFullYear() : "";
    return "";
  }
  return value;
}
