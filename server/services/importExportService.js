/**
 * @fileoverview Import/Export Service
 *
 * Handles CSV/Excel import and export functionality
 */

import XLSX from 'xlsx';
import { createReadStream } from 'fs';
import csv from 'csv-parser';

/**
 * Parse CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Parsed data array
 */
export async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

/**
 * Parse Excel file
 * @param {string} filePath - Path to Excel file
 * @param {string} sheetName - Sheet name (optional, defaults to first sheet)
 * @returns {Array} Parsed data array
 */
export function parseExcel(filePath, sheetName = null) {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheet];

    return XLSX.utils.sheet_to_json(worksheet);
}

/**
 * Parse Excel from buffer (for uploaded files)
 * @param {Buffer} buffer - File buffer
 * @param {string} sheetName - Sheet name (optional)
 * @returns {Array} Parsed data array
 */
export function parseExcelBuffer(buffer, sheetName = null) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheet];

    return XLSX.utils.sheet_to_json(worksheet);
}

/**
 * Convert data to CSV string
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions (optional)
 * @returns {string} CSV string
 */
export function dataToCSV(data, columns = null) {
    if (!data || data.length === 0) {
        return '';
    }

    // Get headers
    const headers = columns
        ? columns.map(col => col.header || col.key)
        : Object.keys(data[0]);

    // Build CSV
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = columns
            ? columns.map(col => {
                const value = col.accessor ? col.accessor(row) : row[col.key];
                return formatCSVValue(value);
            })
            : Object.values(row).map(formatCSVValue);

        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Convert data to Excel buffer
 * @param {Array} data - Array of objects to export
 * @param {string} sheetName - Sheet name (default: 'Sheet1')
 * @param {Array} columns - Column definitions (optional)
 * @returns {Buffer} Excel file buffer
 */
export function dataToExcel(data, sheetName = 'Sheet1', columns = null) {
    if (!data || data.length === 0) {
        // Return empty workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[]]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
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
    const maxWidths = {};
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let C = range.s.c; C <= range.e.c; ++C) {
        maxWidths[C] = 10; // Minimum width

        for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];

            if (cell && cell.v) {
                const length = cell.v.toString().length;
                maxWidths[C] = Math.max(maxWidths[C], Math.min(length + 2, 50));
            }
        }
    }

    ws['!cols'] = Object.keys(maxWidths).map(c => ({ wch: maxWidths[c] }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Format value for CSV (handle commas, quotes, newlines)
 * @param {*} value - Value to format
 * @returns {string} Formatted value
 */
function formatCSVValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

/**
 * Validate imported data against schema
 * @param {Array} data - Imported data
 * @param {Object} schema - Validation schema
 * @returns {Object} { valid: boolean, errors: Array, validRows: Array }
 */
export function validateImport(data, schema) {
    const errors = [];
    const validRows = [];

    data.forEach((row, index) => {
        const rowErrors = [];

        // Check required fields
        schema.required?.forEach(field => {
            if (!row[field] || row[field] === '') {
                rowErrors.push(`Row ${index + 1}: Missing required field '${field}'`);
            }
        });

        // Validate field types and formats
        Object.keys(schema.fields || {}).forEach(field => {
            const fieldSchema = schema.fields[field];
            const value = row[field];

            if (value !== undefined && value !== null && value !== '') {
                // Type validation
                if (fieldSchema.type === 'number' && isNaN(Number(value))) {
                    rowErrors.push(`Row ${index + 1}: Field '${field}' must be a number`);
                }

                if (fieldSchema.type === 'email' && !isValidEmail(value)) {
                    rowErrors.push(`Row ${index + 1}: Field '${field}' must be a valid email`);
                }

                // Min/max validation
                if (fieldSchema.type === 'number') {
                    const numValue = Number(value);
                    if (fieldSchema.min !== undefined && numValue < fieldSchema.min) {
                        rowErrors.push(`Row ${index + 1}: Field '${field}' must be at least ${fieldSchema.min}`);
                    }
                    if (fieldSchema.max !== undefined && numValue > fieldSchema.max) {
                        rowErrors.push(`Row ${index + 1}: Field '${field}' must be at most ${fieldSchema.max}`);
                    }
                }

                // Enum validation
                if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                    rowErrors.push(`Row ${index + 1}: Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`);
                }

                // Custom validation
                if (fieldSchema.validate && !fieldSchema.validate(value)) {
                    rowErrors.push(`Row ${index + 1}: Field '${field}' validation failed`);
                }
            }
        });

        if (rowErrors.length === 0) {
            validRows.push({ ...row, _rowNumber: index + 1 });
        } else {
            errors.push(...rowErrors);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        validRows,
        totalRows: data.length,
        validCount: validRows.length,
        errorCount: data.length - validRows.length
    };
}

/**
 * Simple email validation
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Transform imported data to match model schema
 * @param {Array} data - Imported data
 * @param {Object} mapping - Field mapping { importField: modelField }
 * @param {Object} defaults - Default values for missing fields
 * @returns {Array} Transformed data
 */
export function transformImportData(data, mapping = {}, defaults = {}) {
    return data.map(row => {
        const transformed = { ...defaults };

        Object.keys(row).forEach(key => {
            const modelField = mapping[key] || key;
            transformed[modelField] = row[key];
        });

        return transformed;
    });
}

export default {
    parseCSV,
    parseExcel,
    parseExcelBuffer,
    dataToCSV,
    dataToExcel,
    validateImport,
    transformImportData
};
