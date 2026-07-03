// Storage size formatting/parsing helpers

// Sentinel value for "unlimited" storage/file limits.
export const UNLIMITED = -1;

export const isUnlimited = (limit: number): boolean => limit < 0;

export const formatBytes = (bytes: number): string => {
  if (isUnlimited(bytes)) return 'Unlimited';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Parse a human size string like "1GB" / "100 MB" into bytes.
// Falls back to the numeric value if the unit is unknown.
export const parseBytes = (sizeStr: string): number => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const size = parseFloat(sizeStr);
  const unit = sizeStr.replace(/[\d.]/g, '').trim();

  const index = sizes.indexOf(unit);
  if (index === -1) return size;

  return size * Math.pow(1024, index);
};
