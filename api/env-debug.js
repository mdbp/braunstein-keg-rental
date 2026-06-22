export default function handler(req, res) {
  const checkVar = (name) => {
    const value = process.env[name];
    return {
      exists: value !== undefined,
      type: typeof value,
      length: value ? value.length : 0,
      firstChars: value ? value.substring(0, 15) : null,
      lastChars: value ? value.substring(Math.max(0, value.length - 10)) : null,
      isExactlyTheVarName: value === name
    };
  };

  res.status(200).json({
    DATABASE_URL: checkVar('DATABASE_URL'),
    SHOPIFY_ACCESS_TOKEN: checkVar('SHOPIFY_ACCESS_TOKEN'),
    SHOPIFY_STORE_DOMAIN: checkVar('SHOPIFY_STORE_DOMAIN'),
    SHOPIFY_STORE_URL: checkVar('SHOPIFY_STORE_URL')
  });
}
