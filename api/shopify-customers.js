import { shopifyCustomers } from './shopify-webhook.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Returner alle Shopify kunder
    return res.status(200).json({
      total: shopifyCustomers.length,
      customers: shopifyCustomers
    });
  }

  if (req.method === 'POST' && req.query.sync) {
    // Sync med Shopify (kræver Shopify Admin API)
    const shopifyUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopifyUrl || !accessToken) {
      return res.status(400).json({ 
        error: 'Shopify credentials not configured' 
      });
    }

    // Her ville du kalde Shopify Admin API
    // For nu returnerer vi bare eksisterende data
    return res.status(200).json({
      message: 'Sync initiated',
      existingCustomers: shopifyCustomers.length
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
