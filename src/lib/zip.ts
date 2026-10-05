/**
 * Zero-dependency ZIP file generator for browser downloads.
 * Creates standard STORE (uncompressed) ZIP archives that open natively in Windows, macOS, Linux, and mobile.
 */

// CRC-32 table for ZIP checksums
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

function calculateCRC32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipFileInput {
  name: string;
  data: Uint8Array | string;
}

/**
 * Creates a standard ZIP archive Blob from an array of files.
 */
export function createZipBlob(files: ZipFileInput[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: Array<{
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
    size: number;
  }> = [];

  const parts: Uint8Array[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes =
      typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = calculateCRC32(dataBytes);

    // Local file header (30 bytes)
    const localHeader = new Uint8Array(30);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true);         // Version needed (2.0)
    view.setUint16(6, 0, true);          // General purpose bit flags
    view.setUint16(8, 0, true);          // Compression method (0 = Store)
    view.setUint16(10, 0, true);         // Last mod file time
    view.setUint16(12, 0, true);         // Last mod file date
    view.setUint32(14, crc, true);       // CRC-32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
      size: dataBytes.length,
    });

    parts.push(localHeader, nameBytes, dataBytes);
    currentOffset += 30 + nameBytes.length + dataBytes.length;
  }

  // Central Directory
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const record of fileRecords) {
    // Central directory file header (46 bytes)
    const cdHeader = new Uint8Array(46);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed
    view.setUint16(8, 0, true);          // General purpose bit flags
    view.setUint16(10, 0, true);         // Compression method (0 = Store)
    view.setUint16(12, 0, true);         // Last mod file time
    view.setUint16(14, 0, true);         // Last mod file date
    view.setUint32(16, record.crc, true); // CRC-32
    view.setUint32(20, record.size, true); // Compressed size
    view.setUint32(24, record.size, true); // Uncompressed size
    view.setUint16(28, record.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0, true);         // External file attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    parts.push(cdHeader, record.nameBytes);
    centralDirSize += 46 + record.nameBytes.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Start disk
  eocdView.setUint16(8, fileRecords.length, true);  // Entries on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true);    // Central directory size
  eocdView.setUint32(16, centralDirStart, true);   // Central directory offset
  eocdView.setUint16(20, 0, true);         // Comment length

  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

/**
 * Converts a Base64 dataURL (e.g. data:image/png;base64,...) to a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(',');
  const bstr = atob(base64Index >= 0 ? dataUrl.slice(base64Index + 1) : dataUrl);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
}

/**
 * Triggers a browser download of any Blob reliably.
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore if already unmounted
    }
  }, 10000);
}
