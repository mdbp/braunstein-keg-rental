import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    shopifyId,
    status,
    employee,
    facilities,
    packingNotes,
    emptyKegs,
    fullKegs,
    returnNotes,
    drypbakkeReceived,
    customerSignedName
  } = req.body;

  if (!shopifyId || !status) {
    return res.status(400).json({ error: 'shopifyId og status er påkrævet' });
  }

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString('da-DK');
    const timeStr = now.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

    // Build a human-readable note block matching the old Shopify note format
    let noteBlock = '';
    if (status === 'packed') {
      noteBlock = `\n\n--- PAKKET ---\nAnlæg nr.: ${(facilities || []).join(', ')}\nMedarbejder: ${employee}\nDato: ${dateStr}\nTid: ${timeStr}${packingNotes ? `\nBemærkning: ${packingNotes}` : ''}`;
    } else if (status === 'shipped') {
      noteBlock = `\n\n--- UDLEVERET ---\nKunde: ${customerSignedName || ''}\nMedarbejder: ${employee}\nDato: ${dateStr}\nTid: ${timeStr}\nUnderskrift: ✓`;
    } else if (status === 'returned') {
      noteBlock = `\n\n--- RETURNERET ---\nMedarbejder: ${employee}\nDato: ${dateStr}\nTid: ${timeStr}\nTomme fustager: ${emptyKegs ?? 0}\nFyldte fustager: ${fullKegs ?? 0}\nDrypbakke: ${drypbakkeReceived ? 'Ja' : 'Nej'}${returnNotes ? `\nBemærkning: ${returnNotes}` : ''}`;
    }

    // 1) Update our own Postgres database (source of truth for the app)
    const result = await sql`
      UPDATE orders
      SET
        status = ${status},
        notes = COALESCE(notes, '') || ${noteBlock}
      WHERE shopify_id = ${BigInt(shopifyId)}
      RETURNING id, shopify_id, status, notes
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Ordre ikke fundet i databasen' });
    }

    const updatedOrder = result[0];

    // 2) Mirror the note back to Shopify (best-effort)
    let shopifySyncError = null;
    const shopifyUrl = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ACCESS_TOKEN;

    if (shopifyUrl && token) {
      try {
        const shopifyResponse = await fetch(
          `https://${shopifyUrl}/admin/api/2025-01/orders/${BigInt(shopifyId)}.json`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({
              order: {
                id: Number(shopifyId),
                note: updatedOrder.notes
              }
            })
          }
        );

        if (!shopifyResponse.ok) {
          const errText = await shopifyResponse.text();
          shopifySyncError = `Shopify svarede ${shopifyResponse.status}: ${errText}`;
        }
      } catch (err) {
        shopifySyncError = err.message;
      }
    } else {
      shopifySyncError = 'Shopify credentials ikke konfigureret';
    }

    if (shopifySyncError) {
      console.error('Kunne ikke skrive note tilbage til Shopify:', shopifySyncError);
    }

    res.status(200).json({
      success: true,
      order: updatedOrder,
      shopifySynced: !shopifySyncError,
      shopifySyncError
    });
  } catch (error) {
    console.error('Fejl ved opdatering af ordrestatus:', error);
    res.status(500).json({ error: error.message });
  }
}
