// Reports whether each painting's Stripe Payment Link is still active.
// Matches by the public `url` field on the Payment Link object, so no
// internal Stripe IDs need to be hardcoded here.
const PAYMENT_LINKS = {
  resonance: 'https://buy.stripe.com/4gM14p8Ut6SH0WI2lYes000',
  release: 'https://buy.stripe.com/6oU00lgmV1yn6h2gcOes001',
};

exports.handler = async function () {
  const key = process.env.STRIPE_READ_KEY;

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'STRIPE_READ_KEY is not set' }),
    };
  }

  try {
    const activeByUrl = {};
    let startingAfter;

    do {
      const url = new URL('https://api.stripe.com/v1/payment_links');
      url.searchParams.set('limit', '100');
      if (startingAfter) url.searchParams.set('starting_after', startingAfter);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        throw new Error(`Stripe API responded with ${res.status}`);
      }

      const page = await res.json();
      for (const link of page.data) {
        activeByUrl[link.url] = link.active;
      }
      startingAfter = page.has_more ? page.data[page.data.length - 1].id : null;
    } while (startingAfter);

    const status = {};
    for (const [slug, url] of Object.entries(PAYMENT_LINKS)) {
      status[slug] = Object.prototype.hasOwnProperty.call(activeByUrl, url)
        ? activeByUrl[url]
        : null;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify(status),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
