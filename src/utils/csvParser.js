/**
 * @fileoverview CSV Parser Utility
 *
 * Parse and generate CSV files
 */

import Papa from 'papaparse';

/**
 * Parse CSV file
 * @param {File} file - CSV file to parse
 * @returns {Promise<Object>} { data: Array, errors: Array }
 */
export async function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve({
                    data: results.data,
                    errors: results.errors,
                    meta: results.meta
                });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions (optional)
 * @returns {string} CSV string
 */
export function dataToCSV(data, columns = null) {
    if (!data || data.length === 0) {
        return '';
    }

    const fields = columns
        ? columns.map(col => col.key || col)
        : Object.keys(data[0]);

    return Papa.unparse(data, {
        columns: fields,
        header: true
    });
}

/**
 * Download CSV file
 * @param {Array} data - Data to export
 * @param {string} filename - Filename (without extension)
 * @param {Array} columns - Column definitions (optional)
 */
export function downloadCSV(data, filename, columns = null) {
    const csv = dataToCSV(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate CSV template
 * @param {Array} columns - Column definitions [{ key, header, example }]
 * @returns {string} CSV template
 */
export function generateCSVTemplate(columns) {
    const headers = columns.map(col => col.header || col.key);
    const examples = columns.map(col => col.example || '');

    return Papa.unparse([headers, examples], {
        header: false
    });
}

/**
 * Download CSV template
 * @param {Array} columns - Column definitions
 * @param {string} filename - Filename (without extension)
 */
export function downloadCSVTemplate(columns, filename) {
    const csv = generateCSVTemplate(columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-template.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default {
    parseCSV,
    dataToCSV,
    downloadCSV,
    generateCSVTemplate,
    downloadCSVTemplate
};
