import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const fromDate = req.query.from || '2026-01-01';

    try {
      const { rows } = await sql`
        SELECT * FROM orders
        WHERE created_at >= ${fromDate}
        ORDER BY created_at DESC
      `;

      return res.status(200).json({
        total: rows.length,
        orders: rows
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST' && req.query.test) {
    // Test ordre for udvikling
    const testOrder = {
      id: Date.now(),
      order_number: '9999',
      email: 'test@example.com',
      customer: {
        id: 12345,
        first_name: 'Test',
        last_name: 'Kunde',
        email: 'test@example.com',
        phone: '+45 12345678',
        created_at: new Date().toISOString()
      },
      line_items: [
        {
          id: 'item1',
          sku: 'BR-IPA-20L',
          title: 'Braunstein IPA 20L',
          quantity: 2,
          price: '850.00'
        }
      ],
      shipping_address: {
        address1: 'Testvej 123',
        city: 'København',
        zip: '1000',
        phone: '+45 12345678'
      },
      total_price: '1700.00',
      created_at: new Date().toISOString()
    };

    try {
      await fetch(`https://${req.headers.host}/api/shopify-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });
      return res.status(200).json({
        success: true,
        message: 'Test order created'
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
