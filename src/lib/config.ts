/**
 * Application Configuration
 * Central configuration file for app-wide constants
 */

// The hosting URL for the Nexus University Portal
// This is used for generating QR codes and sharing links
export const HOSTING_URL = "https://universityportal2026.web.app";

/**
 * Generate a QR code URL for sharing results
 * @param studentId - The unique student ID
 * @returns The full URL for results page
 */
export const getResultsShareUrl = (studentId: string): string => {
  return `${HOSTING_URL}/results?student=${studentId}`;
};

/**
 * Generate a QR code URL for sharing timetable
 * @returns The full URL for timetable page
 */
export const getTimetableShareUrl = (): string => {
  return `${HOSTING_URL}/timetable`;
};

/**
 * Generate a QR code URL for ID card verification
 * @param studentId - The unique student ID
 * @returns The full URL for ID card verification
 */
export const getIdCardShareUrl = (studentId: string): string => {
  return `${HOSTING_URL}/id-card?student=${studentId}`;
};

/**
 * Generate a QR code URL for enrollment verification
 * @param studentId - The unique student ID
 * @returns The full URL for enrollment verification
 */
export const getEnrollmentShareUrl = (studentId: string): string => {
  return `${HOSTING_URL}/enrollment?student=${studentId}`;
};

/**
 * Generate a QR code URL for PRN verification
 * @param prnCode - The payment reference number
 * @returns The full URL for PRN verification
 */
export const getPRNShareUrl = (prnCode: string): string => {
  return `${HOSTING_URL}/prn-check?code=${prnCode}`;
};

/**
 * Generate a QR code as a data URL using an external QR code API
 * This generates a PNG image of the QR code that can be embedded in HTML
 * @param text - The text/URL to encode in the QR code
 * @param size - The size of the QR code in pixels (default: 200)
 * @returns A data URL containing the QR code image
 */
export const generateQRCodeDataUrl = (
  text: string,
  size: number = 200,
): string => {
  // Using qr-server.com API to generate QR codes
  // This returns a PNG image that can be embedded in HTML
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
};
