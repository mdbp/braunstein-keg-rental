export default function handler(req, res) {
  const value = process.env.DATABASE_URL;

  res.status(200).json({
    exists: value !== undefined,
    type: typeof value,
    length: value ? value.length : 0,
    firstChars: value ? value.substring(0, 15) : null,
    lastChars: value ? value.substring(value.length - 10) : null,
    isExactlyTheWordDatabaseUrl: value === 'DATABASE_URL'
  });
}
