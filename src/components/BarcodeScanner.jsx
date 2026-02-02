/**
 * @fileoverview Barcode Scanner Component
 * 
 * This component provides camera-based barcode scanning functionality
 * using the html5-qrcode library. It supports multiple barcode formats
 * including EAN-13, UPC-A, Code-128, and QR codes.
 * 
 * @usage
 * <BarcodeScanner 
 *   onScan={(barcode) => handleBarcode(barcode)}
 *   onClose={() => setShowScanner(false)}
 * />
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Flashlight, SwitchCamera } from 'lucide-react';
import './BarcodeScanner.css';

/**
 * BarcodeScanner - Camera-based barcode scanning component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onScan - Callback when barcode is successfully scanned
 * @param {Function} props.onClose - Callback to close the scanner
 * @param {boolean} props.continuous - If true, keeps scanning after first result
 */
function BarcodeScanner({ onScan, onClose, continuous = false }) {
    // Reference to the camera preview container element
    const scannerRef = useRef(null);

    // Reference to the Html5Qrcode instance for cleanup
    const html5QrcodeRef = useRef(null);

    // State for scanner status and errors
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const [lastScanned, setLastScanned] = useState(null);

    /**
     * Initialize the barcode scanner on component mount.
     * Requests camera permission and starts the scanning process.
     */
    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            try {
                // Create new scanner instance with the container element ID
                const html5Qrcode = new Html5Qrcode('barcode-scanner-region');
                html5QrcodeRef.current = html5Qrcode;

                // Scanner configuration options
                const config = {
                    fps: 10, // Frames per second for scanning
                    qrbox: { width: 250, height: 150 }, // Scanning region size
                    aspectRatio: 1.777778, // 16:9 aspect ratio
                    formatsToSupport: [
                        // Supported barcode formats for retail products
                        Html5Qrcode.FORMATS?.EAN_13,
                        Html5Qrcode.FORMATS?.EAN_8,
                        Html5Qrcode.FORMATS?.UPC_A,
                        Html5Qrcode.FORMATS?.UPC_E,
                        Html5Qrcode.FORMATS?.CODE_128,
                        Html5Qrcode.FORMATS?.CODE_39,
                        Html5Qrcode.FORMATS?.QR_CODE
                    ].filter(Boolean) // Filter out undefined formats
                };

                /**
                 * Success callback - triggered when a barcode is decoded
                 * @param {string} decodedText - The decoded barcode value
                 * @param {Object} decodedResult - Full result object with format info
                 */
                const onScanSuccess = (decodedText, decodedResult) => {
                    if (!isMounted) return;

                    // Prevent duplicate scans of the same barcode
                    if (decodedText === lastScanned) return;

                    setLastScanned(decodedText);

                    // Vibrate device if supported (for haptic feedback)
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }

                    // Call the parent callback with scanned barcode
                    onScan(decodedText);

                    // Stop scanning if not in continuous mode
                    if (!continuous) {
                        stopScanner();
                        onClose();
                    }
                };

                /**
                 * Error callback - triggered when scanning fails to decode
                 * This is called frequently as the scanner analyzes each frame,
                 * so we don't show these errors to the user.
                 */
                const onScanError = (errorMessage) => {
                    // Silently ignore scan errors (expected when no barcode in frame)
                };

                // Start the camera and begin scanning
                await html5Qrcode.start(
                    { facingMode: 'environment' }, // Use rear camera
                    config,
                    onScanSuccess,
                    onScanError
                );

                if (isMounted) {
                    setIsScanning(true);
                    setError(null);
                }
            } catch (err) {
                // Handle camera permission errors or other issues
                console.error('Scanner error:', err);
                if (isMounted) {
                    if (err.message?.includes('permission')) {
                        setError('Camera permission denied. Please allow camera access.');
                    } else {
                        setError('Unable to start camera. Please check permissions.');
                    }
                }
            }
        };

        startScanner();

        // Cleanup function - stop scanner when component unmounts
        return () => {
            isMounted = false;
            stopScanner();
        };
    }, []);

    /**
     * Stop the barcode scanner and release camera resources.
     * This is called on component unmount or when closing the scanner.
     */
    const stopScanner = async () => {
        if (html5QrcodeRef.current) {
            try {
                await html5QrcodeRef.current.stop();
                html5QrcodeRef.current.clear();
            } catch (err) {
                // Ignore stop errors (scanner may already be stopped)
            }
        }
    };

    /**
     * Handle manual barcode entry for cases where scanning doesn't work.
     * Shows a prompt for the user to type the barcode manually.
     */
    const handleManualEntry = () => {
        const barcode = prompt('Enter barcode manually:');
        if (barcode && barcode.trim()) {
            onScan(barcode.trim());
            onClose();
        }
    };

    return (
        <div className="barcode-scanner-overlay">
            <div className="barcode-scanner-modal">
                {/* Header with close button */}
                <div className="scanner-header">
                    <h3>Scan Barcode</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Camera preview container */}
                <div className="scanner-viewport">
                    {error ? (
                        // Show error state with manual entry option
                        <div className="scanner-error">
                            <Camera size={48} />
                            <p>{error}</p>
                            <button className="btn btn-primary" onClick={handleManualEntry}>
                                Enter Manually
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Html5Qrcode will render camera preview here */}
                            <div id="barcode-scanner-region" ref={scannerRef} />

                            {/* Scanning indicator overlay */}
                            {isScanning && (
                                <div className="scanner-overlay">
                                    <div className="scan-line" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer with instructions */}
                <div className="scanner-footer">
                    <p>Position the barcode within the frame</p>
                    <button className="btn btn-secondary" onClick={handleManualEntry}>
                        Enter Manually
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BarcodeScanner;
