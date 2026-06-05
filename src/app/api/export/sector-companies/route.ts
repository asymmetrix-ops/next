import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import ExcelJS from 'exceljs';

const TEMPLATE_PATH = path.join(process.cwd(), 'src/app/api/export/sector-companies/template.xlsx');

const HEADER_ROW = 9;
const DATA_START_ROW = 10;

// Column widths (in Excel units) for each output column
const COL_WIDTHS: Record<string, number> = {
  'ID': 10,
  'Name': 35,
  'Asymmetrix URL': 45,
  'Description': 80,
  'Primary Sector(s)': 35,
  'Sub-Sector(s)': 40,
  'LinkedIn Members': 18,
  'Country': 22,
  'Filters Applied': 60,
};

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

    // Find and remove the "URL" column from the template before building colMap
    const headerRow = sheet.getRow(HEADER_ROW);
    let urlColNumber: number | null = null;
    headerRow.eachCell((cell, colNumber) => {
      if (String(cell.value ?? '').trim() === 'URL') {
        urlColNumber = colNumber;
      }
    });
    if (urlColNumber !== null) {
      sheet.spliceColumns(urlColNumber, 1);
    }

    // Rebuild colMap after splice
    const updatedHeaderRow = sheet.getRow(HEADER_ROW);
    const colMap: Record<string, number> = {};
    updatedHeaderRow.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? '').trim();
      if (val) colMap[val] = colNumber;
    });

    // Apply proper column widths to all data columns
    Object.entries(colMap).forEach(([name, colNum]) => {
      const width = COL_WIDTHS[name];
      if (width) {
        const col = sheet.getColumn(colNum);
        col.width = width;
        col.alignment = { wrapText: false, vertical: 'middle' };
      }
    });

    // Add "Filters Applied" header + width if needed
    const countryCol = colMap['Country'] ?? 9;
    const filtersCol = countryCol + 1;
    if (hasFilters) {
      const refCell = updatedHeaderRow.getCell(countryCol);
      const hCell = updatedHeaderRow.getCell(filtersCol);
      hCell.value = 'Filters Applied';
      hCell.style = { ...refCell.style };
      const col = sheet.getColumn(filtersCol);
      col.width = COL_WIDTHS['Filters Applied'];
      col.alignment = { wrapText: false, vertical: 'middle' };
    }
    updatedHeaderRow.commit();

    // Clear any pre-existing sample data rows
    const rowsToRemove = sheet.rowCount - DATA_START_ROW + 1;
    if (rowsToRemove > 0) {
      sheet.spliceRows(DATA_START_ROW, rowsToRemove);
    }

    // Write each data row
    rows.forEach((data, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const row = sheet.getRow(rowNum);
      row.height = 16;

      const set = (colName: string, value: string | number) => {
        const col = colMap[colName];
        if (!col) return;
        const cell = row.getCell(col);
        cell.value = value;
        cell.alignment = { vertical: 'middle', wrapText: false };
        // Alternating row fill for readability
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
        // Make Asymmetrix URL a hyperlink
        if (colName === 'Asymmetrix URL' && typeof value === 'string' && value.startsWith('http')) {
          cell.value = { text: value, hyperlink: value };
          cell.font = { color: { argb: 'FF0070C0' }, underline: true };
        }
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
        cell.alignment = { vertical: 'middle', wrapText: false };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
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
