import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaCamera, FaTimes, FaCheckCircle } from 'react-icons/fa';
import './QRScanner.css';

/**
 * QR Code Scanner Component
 * Uses device camera to scan QR codes for equipment tracking
 * Supports both camera and flashcard scanning
 */
const QRScanner = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
  subtitle = 'Point camera at QR code on equipment'
}) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [cameraId, setCameraId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => {
          console.error('Error stopping scanner:', err);
        });
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setScanning(false);
      setScannedData(null);
      setError(null);
      return;
    }

    // Initialize scanner when modal opens
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setError('No cameras found on this device');
          return;
        }

        // Prefer back camera for mobile devices
        const backCamera = devices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear')
        );
        const selectedCamera = backCamera || devices[0];
        setCameraId(selectedCamera.id);

        // Start scanning
        await scanner.start(
          selectedCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            // Success! QR code scanned
            setScannedData(decodedText);
            setScanning(false);

            // Stop scanner after successful scan
            scanner.stop().catch(err => {
              console.error('Error stopping scanner after scan:', err);
            });

            // Call parent callback with scanned data
            setTimeout(() => {
              onScan?.(decodedText);
            }, 500);
          },
          (errorMessage) => {
            // Ignore scan errors (happens constantly while searching)
            // console.log('Scan error:', errorMessage);
          }
        );

        setScanning(true);
        setError(null);
      } catch (err) {
        console.error('Scanner initialization error:', err);
        setError(err.message || 'Failed to start camera. Please allow camera access.');
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => {
          console.error('Error stopping scanner on cleanup:', err);
        });
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(err => {
        console.error('Error stopping scanner:', err);
      });
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="qr-scanner-backdrop" onClick={handleClose}>
      <div className="qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <div>
            <h2>
              <FaCamera />
              {title}
            </h2>
            <p>{subtitle}</p>
          </div>
          <button className="qr-close-btn" onClick={handleClose} aria-label="Close scanner">
            <FaTimes />
          </button>
        </div>

        <div className="qr-scanner-body">
          {error && (
            <div className="qr-error">
              <p>{error}</p>
              <button className="btn-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          )}

          {!error && (
            <>
              <div id="qr-reader" className={`qr-reader-container ${scanning ? 'scanning' : ''}`}>
                {!scanning && !scannedData && (
                  <div className="qr-loading">
                    <p>Initializing camera...</p>
                  </div>
                )}
              </div>

              {scannedData && (
                <div className="qr-success">
                  <FaCheckCircle />
                  <h3>Success!</h3>
                  <p className="scanned-data">{scannedData}</p>
                </div>
              )}

              {scanning && !scannedData && (
                <div className="qr-instructions">
                  <p>📷 Position QR code within the frame</p>
                  <p className="qr-tip">Works with QR codes on equipment or printed flashcards</p>
                </div>
              )}
            </>
          )}
        </div>

        {!error && !scannedData && (
          <div className="qr-scanner-footer">
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
