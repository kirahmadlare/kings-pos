/**
 * @fileoverview Export Service
 *
 * Handles data export to CSV, Excel, and PDF formats
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { formatCurrency, formatDate } from '../utils/format.js';

/**
 * Export data to CSV format
 */
export async function exportToCSV(data, columns) {
    try {
        // Create CSV header
        const header = columns.map(col => col.header).join(',');

        // Create CSV rows
        const rows = data.map(item => {
            return columns.map(col => {
                const value = col.accessor(item);
                // Escape quotes and wrap in quotes if contains comma
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',');
        });

        return [header, ...rows].join('\n');
    } catch (error) {
        console.error('CSV export error:', error);
        throw new Error('Failed to export to CSV');
    }
}

/**
 * Export data to Excel format
 */
export async function exportToExcel(data, columns, options = {}) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(options.sheetName || 'Data');

        // Set column headers with styling
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15
        }));

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Primary color
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Add data rows
        data.forEach(item => {
            const row = {};
            columns.forEach(col => {
                row[col.key] = col.accessor(item);
            });
            worksheet.addRow(row);
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: String.fromCharCode(64 + columns.length) + '1'
        };

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    } catch (error) {
        console.error('Excel export error:', error);
        throw new Error('Failed to export to Excel');
    }
}

/**
 * Export data to PDF format
 */
export async function exportToPDF(data, columns, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: options.orientation === 'landscape' ? [792, 612] : 'LETTER',
                margin: 50
            });

            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Add company header
            if (options.title) {
                doc.fontSize(20)
                   .font('Helvetica-Bold')
                   .text(options.title, { align: 'center' });
                doc.moveDown();
            }

            if (options.subtitle) {
                doc.fontSize(12)
                   .font('Helvetica')
                   .text(options.subtitle, { align: 'center' });
                doc.moveDown();
            }

            // Add metadata
            if (options.metadata) {
                doc.fontSize(10);
                Object.entries(options.metadata).forEach(([key, value]) => {
                    doc.text(`${key}: ${value}`);
                });
                doc.moveDown();
            }

            // Table setup
            const tableTop = doc.y;
            const itemHeight = 25;
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const colWidth = pageWidth / columns.length;

            // Draw table header
            doc.fontSize(10).font('Helvetica-Bold');
            columns.forEach((col, i) => {
                doc.rect(
                    doc.page.margins.left + (i * colWidth),
                    tableTop,
                    colWidth,
                    itemHeight
                ).fillAndStroke('#4F46E5', '#4F46E5');

                doc.fillColor('white')
                   .text(
                       col.header,
                       doc.page.margins.left + (i * colWidth) + 5,
                       tableTop + 8,
                       {
                           width: colWidth - 10,
                           align: 'left'
                       }
                   );
            });

            // Draw table rows
            doc.font('Helvetica').fillColor('black');
            let yPosition = tableTop + itemHeight;

            data.forEach((item, rowIndex) => {
                // Check if we need a new page
                if (yPosition > doc.page.height - doc.page.margins.bottom - itemHeight) {
                    doc.addPage();
                    yPosition = doc.page.margins.top;

                    // Redraw header on new page
                    doc.fontSize(10).font('Helvetica-Bold');
                    columns.forEach((col, i) => {
                        doc.rect(
                            doc.page.margins.left + (i * colWidth),
                            yPosition,
                            colWidth,
                            itemHeight
                        ).fillAndStroke('#4F46E5', '#4F46E5');

                        doc.fillColor('white')
                           .text(
                               col.header,
                               doc.page.margins.left + (i * colWidth) + 5,
                               yPosition + 8,
                               {
                                   width: colWidth - 10,
                                   align: 'left'
                               }
                           );
                    });
                    doc.font('Helvetica').fillColor('black');
                    yPosition += itemHeight;
                }

                // Draw row background (alternate colors)
                const bgColor = rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
                doc.rect(
                    doc.page.margins.left,
                    yPosition,
                    pageWidth,
                    itemHeight
                ).fill(bgColor);

                // Draw cell borders and text
                columns.forEach((col, i) => {
                    const value = col.accessor(item);
                    doc.rect(
                        doc.page.margins.left + (i * colWidth),
                        yPosition,
                        colWidth,
                        itemHeight
                    ).stroke('#E5E7EB');

                    doc.fillColor('black')
                       .text(
                           String(value || ''),
                           doc.page.margins.left + (i * colWidth) + 5,
                           yPosition + 8,
                           {
                               width: colWidth - 10,
                               align: 'left',
                               ellipsis: true
                           }
                       );
                });

                yPosition += itemHeight;
            });

            // Add footer with page numbers
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                   .text(
                       `Page ${i + 1} of ${pages.count}`,
                       doc.page.margins.left,
                       doc.page.height - 50,
                       { align: 'center' }
                   );
            }

            doc.end();
        } catch (error) {
            console.error('PDF export error:', error);
            reject(new Error('Failed to export to PDF'));
        }
    });
}

/**
 * Generate sales report
 */
export async function generateSalesReport(sales, format, options = {}) {
    const columns = [
        { key: 'date', header: 'Date', accessor: s => formatDate(s.createdAt), width: 20 },
        { key: 'orderId', header: 'Order ID', accessor: s => s.orderId || s._id.toString().slice(-8), width: 15 },
        { key: 'customer', header: 'Customer', accessor: s => s.customerName || 'Walk-in', width: 25 },
        { key: 'items', header: 'Items', accessor: s => s.items?.length || 0, width: 10 },
        { key: 'subtotal', header: 'Subtotal', accessor: s => formatCurrency(s.subtotal), width: 15 },
        { key: 'tax', header: 'Tax', accessor: s => formatCurrency(s.tax), width: 12 },
        { key: 'total', header: 'Total', accessor: s => formatCurrency(s.total), width: 15 },
        { key: 'payment', header: 'Payment Method', accessor: s => s.paymentMethod || 'Cash', width: 15 },
        { key: 'status', header: 'Status', accessor: s => s.status, width: 12 }
    ];

    const pdfOptions = {
        title: 'Sales Report',
        subtitle: options.dateRange ? `Period: ${options.dateRange}` : '',
        metadata: {
            'Generated': formatDate(new Date()),
            'Total Sales': formatCurrency(sales.reduce((sum, s) => sum + s.total, 0)),
            'Total Transactions': sales.length
        },
        orientation: 'landscape'
    };

    switch (format) {
        case 'csv':
            return await exportToCSV(sales, columns);
        case 'excel':
            return await exportToExcel(sales, columns, { sheetName: 'Sales Report' });
        case 'pdf':
            return await exportToPDF(sales, columns, pdfOptions);
        default:
            throw new Error('Unsupported export format');
    }
}

/**
 * Generate inventory report
 */
export async function generateInventoryReport(products, format, options = {}) {
    const columns = [
        { key: 'sku', header: 'SKU', accessor: p => p.sku || 'N/A', width: 15 },
        { key: 'name', header: 'Product Name', accessor: p => p.name, width: 30 },
        { key: 'category', header: 'Category', accessor: p => p.category?.name || 'Uncategorized', width: 20 },
        { key: 'quantity', header: 'Quantity', accessor: p => p.quantity, width: 12 },
        { key: 'price', header: 'Price', accessor: p => formatCurrency(p.price), width: 15 },
        { key: 'costPrice', header: 'Cost Price', accessor: p => formatCurrency(p.costPrice), width: 15 },
        { key: 'value', header: 'Total Value', accessor: p => formatCurrency(p.quantity * p.costPrice), width: 15 },
        { key: 'status', header: 'Status', accessor: p => p.quantity === 0 ? 'Out of Stock' : p.quantity <= p.lowStockThreshold ? 'Low Stock' : 'In Stock', width: 15 }
    ];

    const pdfOptions = {
        title: 'Inventory Report',
        subtitle: 'Current Stock Levels',
        metadata: {
            'Generated': formatDate(new Date()),
            'Total Products': products.length,
            'Total Value': formatCurrency(products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0))
        },
        orientation: 'landscape'
    };

    switch (format) {
        case 'csv':
            return await exportToCSV(products, columns);
        case 'excel':
            return await exportToExcel(products, columns, { sheetName: 'Inventory Report' });
        case 'pdf':
            return await exportToPDF(products, columns, pdfOptions);
        default:
            throw new Error('Unsupported export format');
    }
}

/**
 * Generate customer report
 */
export async function generateCustomerReport(customers, format, options = {}) {
    const columns = [
        { key: 'name', header: 'Name', accessor: c => `${c.firstName} ${c.lastName}`, width: 25 },
        { key: 'email', header: 'Email', accessor: c => c.email || 'N/A', width: 30 },
        { key: 'phone', header: 'Phone', accessor: c => c.phone || 'N/A', width: 20 },
        { key: 'totalSpent', header: 'Total Spent', accessor: c => formatCurrency(c.totalSpent || 0), width: 15 },
        { key: 'totalOrders', header: 'Total Orders', accessor: c => c.totalOrders || 0, width: 15 },
        { key: 'lastOrder', header: 'Last Order', accessor: c => c.lastOrderDate ? formatDate(c.lastOrderDate) : 'Never', width: 20 },
        { key: 'loyaltyPoints', header: 'Loyalty Points', accessor: c => c.loyaltyPoints || 0, width: 15 }
    ];

    const pdfOptions = {
        title: 'Customer Report',
        subtitle: 'Customer Database',
        metadata: {
            'Generated': formatDate(new Date()),
            'Total Customers': customers.length
        }
    };

    switch (format) {
        case 'csv':
            return await exportToCSV(customers, columns);
        case 'excel':
            return await exportToExcel(customers, columns, { sheetName: 'Customer Report' });
        case 'pdf':
            return await exportToPDF(customers, columns, pdfOptions);
        default:
            throw new Error('Unsupported export format');
    }
}
