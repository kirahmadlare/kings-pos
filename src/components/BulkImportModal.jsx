/**
 * @fileoverview Bulk Import Modal Component
 *
 * Modal for importing data from CSV or Excel files
 */

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, X } from 'lucide-react';
import { parseCSV, downloadCSVTemplate } from '../utils/csvParser';
import { parseExcel } from '../utils/excelParser';
import { toast } from '../stores/toastStore';
import api from '../services/api';
import './BulkImport.css';

export default function BulkImportModal({ isOpen, onClose, entityType, onSuccess, templateColumns }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = async (event) => {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setResults(null);

        // Parse file for preview
        try {
            let data;
            const filename = selectedFile.name.toLowerCase();

            if (filename.endsWith('.csv')) {
                const result = await parseCSV(selectedFile);
                data = result.data;
            } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                const result = await parseExcel(selectedFile);
                data = result.data;
            } else {
                toast.error('Please select a CSV or Excel file');
                setFile(null);
                return;
            }

            setPreview(data.slice(0, 5)); // Preview first 5 rows
        } catch (error) {
            console.error('Failed to parse file:', error);
            toast.error('Failed to read file');
            setFile(null);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.products.import(formData);

            setResults(response);

            if (response.success) {
                toast.success(`Import complete: ${response.created} created, ${response.updated} updated`);

                if (onSuccess) {
                    onSuccess(response);
                }

                // Close after 3 seconds if no errors
                if (response.errors.length === 0) {
                    setTimeout(() => {
                        handleClose();
                    }, 3000);
                }
            } else {
                toast.error('Import failed with validation errors');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error(error.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setResults(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    const handleDownloadTemplate = () => {
        // Use CSV template download
        downloadCSVTemplate(templateColumns || getDefaultColumns(entityType), entityType);
    };

    return (
        <div className="modal-overlay bulk-import-modal">
            <div className="modal">
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            Import {entityType}
                        </h2>
                        <p className="text-sm text-secondary mt-1">
                            Upload a CSV or Excel file to import {entityType}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="btn btn-ghost btn-icon"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-body">
                    {!results ? (
                        <>
                            {/* File Upload Area */}
                            <div className="mb-6">
                                <label
                                    htmlFor="file-upload"
                                    className={`bulk-import-upload-zone ${file ? 'active' : ''}`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        id="file-upload"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileSelect}
                                        className="bulk-import-hidden-input"
                                    />
                                    <div className="bulk-import-upload-icon">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3>
                                        {file ? file.name : 'Click to upload or drag and drop'}
                                    </h3>
                                    <p>
                                        CSV or Excel files only (Max 10MB)
                                    </p>
                                </label>

                                {file && (
                                    <div className="bulk-import-file-info">
                                        <div className="bulk-import-file-details">
                                            <div className="bulk-import-file-icon">
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div className="bulk-import-file-meta">
                                                <h4>{file.name}</h4>
                                                <p>{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFile(null);
                                                setPreview(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Download Template */}
                            <div className="bulk-import-template">
                                <span className="bulk-import-template-text">
                                    Need a template?
                                </span>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="bulk-import-template-link"
                                >
                                    <Download className="w-4 h-4 inline mr-1" />
                                    Download Template
                                </button>
                            </div>

                            {/* Preview */}
                            {preview && preview.length > 0 && (
                                <div className="bulk-import-preview">
                                    <div className="bulk-import-preview-header">
                                        <h3 className="bulk-import-preview-title">Preview</h3>
                                        <span className="bulk-import-preview-count">
                                            Showing first 5 rows
                                        </span>
                                    </div>
                                    <div className="bulk-import-preview-table-container">
                                        <table className="bulk-import-preview-table">
                                            <thead>
                                                <tr>
                                                    {Object.keys(preview[0]).map((key) => (
                                                        <th key={key}>{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.map((row, index) => (
                                                    <tr key={index}>
                                                        {Object.values(row).map((value, i) => (
                                                            <td key={i}>{String(value)}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Results */
                        <div>
                            {/* Success Summary */}
                            {results.success && (
                                <div className="bulk-import-success">
                                    <div className="bulk-import-success-icon">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h3>Import Successful</h3>
                                    <p>
                                        {results.created} created • {results.updated} updated • {results.totalProcessed} total
                                    </p>
                                </div>
                            )}

                            {/* Errors */}
                            {results.errors && results.errors.length > 0 && (
                                <div className="bulk-import-errors">
                                    <div className="bulk-import-errors-header">
                                        <AlertCircle className="w-5 h-5 bulk-import-errors-icon" />
                                        <h3 className="bulk-import-errors-title">
                                            {results.errors.length} Error(s)
                                        </h3>
                                    </div>
                                    <ul className="bulk-import-errors-list">
                                        {results.errors.map((error, index) => (
                                            <li key={index}>
                                                {typeof error === 'string' ? error : error.error || JSON.stringify(error)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        onClick={handleClose}
                        className="btn btn-secondary"
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>
                    {!results && (
                        <button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="btn btn-primary"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            {importing ? 'Importing...' : 'Import'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Default column templates for different entity types
function getDefaultColumns(entityType) {
    const templates = {
        products: [
            { key: 'name', header: 'Product Name', example: 'Coffee Beans' },
            { key: 'sku', header: 'SKU', example: 'COF-001' },
            { key: 'barcode', header: 'Barcode', example: '123456789' },
            { key: 'description', header: 'Description', example: 'Premium coffee beans' },
            { key: 'price', header: 'Price', example: '15.99' },
            { key: 'costPrice', header: 'Cost Price', example: '8.00' },
            { key: 'quantity', header: 'Quantity', example: '100' },
            { key: 'reorderLevel', header: 'Reorder Level', example: '10' },
            { key: 'category', header: 'Category', example: 'Beverages' },
            { key: 'isActive', header: 'Active', example: 'true' }
        ],
        customers: [
            { key: 'firstName', header: 'First Name', example: 'John' },
            { key: 'lastName', header: 'Last Name', example: 'Doe' },
            { key: 'email', header: 'Email', example: 'john@example.com' },
            { key: 'phone', header: 'Phone', example: '555-0123' },
            { key: 'address', header: 'Address', example: '123 Main St' },
            { key: 'city', header: 'City', example: 'New York' },
            { key: 'state', header: 'State', example: 'NY' },
            { key: 'zipCode', header: 'Zip Code', example: '10001' }
        ]
    };

    return templates[entityType] || [];
}
