/**
 * @fileoverview Excel Parser Utility
 *
 * Parse and generate Excel files
 */

import * as XLSX from 'xlsx';

/**
 * Parse Excel file
 * @param {File} file - Excel file to parse
 * @param {string} sheetName - Sheet name (optional, defaults to first sheet)
 * @returns {Promise<Object>} { data: Array, sheetNames: Array }
 */
export async function parseExcel(file, sheetName = null) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const sheet = sheetName || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheet];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: ''
                });

                // Convert array of arrays to array of objects
                if (jsonData.length === 0) {
                    resolve({ data: [], sheetNames: workbook.SheetNames });
                    return;
                }

                const headers = jsonData[0];
                const rows = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] !== undefined ? row[index] : '';
                    });
                    return obj;
                });

                resolve({
                    data: rows,
                    sheetNames: workbook.SheetNames
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
}

/**
 * Convert data to Excel file
 * @param {Array} data - Array of objects
 * @param {string} sheetName - Sheet name (default: 'Sheet1')
 * @param {Array} columns - Column definitions (optional)
 * @returns {Blob} Excel file blob
 */
export function dataToExcel(data, sheetName = 'Sheet1', columns = null) {
    if (!data || data.length === 0) {
        // Create empty workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[]]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    // Transform data if columns provided
    let exportData = data;
    if (columns) {
        exportData = data.map(row => {
            const transformed = {};
            columns.forEach(col => {
                const header = col.header || col.key;
                const value = col.accessor ? col.accessor(row) : row[col.key];
                transformed[header] = value;
            });
            return transformed;
        });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const maxWidths = [];
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10; // Minimum width

        for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];

            if (cell && cell.v) {
                const length = cell.v.toString().length;
                maxWidth = Math.max(maxWidth, Math.min(length + 2, 50));
            }
        }

        maxWidths[C] = { wch: maxWidth };
    }

    ws['!cols'] = maxWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download Excel file
 * @param {Array} data - Data to export
 * @param {string} filename - Filename (without extension)
 * @param {string} sheetName - Sheet name (default: 'Sheet1')
 * @param {Array} columns - Column definitions (optional)
 */
export function downloadExcel(data, filename, sheetName = 'Sheet1', columns = null) {
    const blob = dataToExcel(data, sheetName, columns);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate Excel template
 * @param {Array} columns - Column definitions [{ key, header, example }]
 * @param {string} sheetName - Sheet name (default: 'Template')
 * @returns {Blob} Excel template blob
 */
export function generateExcelTemplate(columns, sheetName = 'Template') {
    const headers = columns.map(col => col.header || col.key);
    const examples = columns.map(col => col.example || '');

    const data = [headers, examples];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Style header row (bold)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[cellAddress]) {
            ws[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: 'E0E0E0' } }
            };
        }
    }

    // Auto-size columns
    ws['!cols'] = columns.map(col => ({
        wch: Math.max((col.header || col.key).length + 2, 15)
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download Excel template
 * @param {Array} columns - Column definitions
 * @param {string} filename - Filename (without extension)
 * @param {string} sheetName - Sheet name (default: 'Template')
 */
export function downloadExcelTemplate(columns, filename, sheetName = 'Template') {
    const blob = generateExcelTemplate(columns, sheetName);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-template.xlsx`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default {
    parseExcel,
    dataToExcel,
    downloadExcel,
    generateExcelTemplate,
    downloadExcelTemplate
};
