export default async function handler(req, res) {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopifyUrl || !token) {
    return res.status(200).json({
      error: 'Shopify not configured',
      message: 'Add SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to environment variables'
    });
  }
  
  try {
    const ordersRes = await fetch(`https://${shopifyUrl}/admin/api/2024-01/orders.json`, {
      headers: {'X-Shopify-Access-Token': token}
    });
    const orders = await ordersRes.json();
    
    res.status(200).json({
      success: true,
      orders: orders.orders || [],
      message: 'Connected to Shopify'
    });
  } catch (error) {
    res.status(200).json({error: error.message});
  }
}
