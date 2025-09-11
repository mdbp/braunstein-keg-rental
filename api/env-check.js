export default function handler(req, res) {
  res.status(200).json({
    hasStoreUrl: !!process.env.SHOPIFY_STORE_URL,
    hasToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
    envKeys: Object.keys(process.env).filter(key => key.includes('SHOPIFY'))
  });
}
