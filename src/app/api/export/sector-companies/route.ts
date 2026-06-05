import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import ExcelJS from 'exceljs';

// Template lives next to this route file
const TEMPLATE_PATH = path.join(process.cwd(), 'src/app/api/export/sector-companies/template.xlsx');

// Row in the template where headers sit; data fills from the row after
const HEADER_ROW = 9;
const DATA_START_ROW = 10;

export interface ExportRow {
  id: string | number;
  name: string;
  asymmetrixUrl: string;
  description: string;
  primarySectors: string;
  subSectors: string;
  linkedinMembers: string | number;
  country: string;
  filtersApplied?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: ExportRow[];
      filename?: string;
    };

    const { rows = [], filename = 'export' } = body;
    const hasFilters = rows.some((r) => r.filtersApplied);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);

    const sheet = workbook.worksheets[0];

    // Detect column positions from the header row in the template
    const headerRow = sheet.getRow(HEADER_ROW);
    const colMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? '').trim();
      if (val) colMap[val] = colNumber;
    });

    // If user has active filters, add the extra column header next to Country
    const countryCol = colMap['Country'] ?? 10;
    const filtersCol = countryCol + 1;
    if (hasFilters) {
      const hCell = headerRow.getCell(filtersCol);
      // Copy the style from the Country header cell
      const refCell = headerRow.getCell(countryCol);
      hCell.value = 'Filters Applied';
      hCell.style = { ...refCell.style };
    }
    headerRow.commit();

    // Helper: get a style ref from the first data row if it exists, else from header
    const getDataStyle = (colNumber: number): Partial<ExcelJS.Style> => {
      const refRow = sheet.getRow(DATA_START_ROW);
      const refCell = refRow.getCell(colNumber);
      return refCell.style ?? {};
    };

    // Clear any pre-existing sample data rows
    for (let r = DATA_START_ROW; r <= sheet.rowCount; r++) {
      sheet.spliceRows(DATA_START_ROW, 1);
    }

    // Write each data row
    rows.forEach((data, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const row = sheet.getRow(rowNum);

      const set = (colName: string, value: string | number) => {
        const col = colMap[colName];
        if (!col) return;
        const cell = row.getCell(col);
        cell.value = value;
        cell.style = getDataStyle(col);
      };

      set('ID', data.id);
      set('Name', data.name);
      set('Asymmetrix URL', data.asymmetrixUrl);
      set('Description', data.description);
      set('Primary Sector(s)', data.primarySectors);
      set('Sub-Sector(s)', data.subSectors);
      set('LinkedIn Members', data.linkedinMembers);
      set('Country', data.country);

      if (hasFilters) {
        const cell = row.getCell(filtersCol);
        cell.value = data.filtersApplied ?? '';
        cell.style = getDataStyle(countryCol);
      }

      row.commit();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[EXPORT] Failed to generate Excel:', err);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
