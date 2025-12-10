// Script to update a product's image
// Usage: node update-product-image.js <productId> <imageUrl>
// Or: node update-product-image.js --find "steve madden" (to find product ID)

require('dotenv').config();

const SUPABASE_URL = 'https://qqenztbtabitcxyilktl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY not found in .env file');
  process.exit(1);
}

async function findProduct(searchTerm) {
  try {
    // Search by title or URL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,title,url,images&or=(title.ilike.*${encodeURIComponent(searchTerm)}*,url.ilike.*${encodeURIComponent(searchTerm)}*)&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const products = await response.json();
      return products;
    }
    return [];
  } catch (error) {
    console.error('Error finding product:', error);
    return [];
  }
}

async function updateProductImage(productId, imageUrl) {
  try {
    // First, get current product to preserve other images if needed
    const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=images`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    let images = [imageUrl]; // Set the new image as the first (primary) image
    
    if (getResponse.ok) {
      const products = await getResponse.json();
      if (products.length > 0 && products[0].images && Array.isArray(products[0].images)) {
        // Keep existing images but put the new one first
        const existingImages = products[0].images.filter(img => img !== imageUrl);
        images = [imageUrl, ...existingImages];
      }
    }

    // Update product with new image
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ images: images })
    });

    if (updateResponse.ok) {
      const updated = await updateResponse.json();
      console.log('✅ Product image updated successfully!');
      console.log(`   Product ID: ${productId}`);
      console.log(`   New primary image: ${imageUrl}`);
      return true;
    } else {
      const error = await updateResponse.text();
      console.error('❌ Failed to update:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node update-product-image.js <productId> <imageUrl>');
    console.log('  node update-product-image.js --find "search term"');
    console.log('');
    console.log('Examples:');
    console.log('  node update-product-image.js 123 https://example.com/image.jpg');
    console.log('  node update-product-image.js --find "steve madden"');
    process.exit(1);
  }

  if (args[0] === '--find') {
    const searchTerm = args.slice(1).join(' ');
    if (!searchTerm) {
      console.error('❌ Please provide a search term');
      process.exit(1);
    }
    
    console.log(`🔍 Searching for products matching "${searchTerm}"...\n`);
    const products = await findProduct(searchTerm);
    
    if (products.length === 0) {
      console.log('❌ No products found');
    } else {
      console.log(`Found ${products.length} product(s):\n`);
      products.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`Title: ${p.title}`);
        console.log(`URL: ${p.url}`);
        console.log(`Current images: ${p.images && p.images.length > 0 ? p.images[0] : 'None'}`);
        console.log('---');
      });
    }
  } else if (args.length >= 2) {
    const productId = parseInt(args[0]);
    const imageUrl = args[1];

    if (isNaN(productId)) {
      console.error('❌ Invalid product ID');
      process.exit(1);
    }

    if (!imageUrl.startsWith('http')) {
      console.error('❌ Invalid image URL');
      process.exit(1);
    }

    console.log(`🖼️  Updating product ${productId} with image: ${imageUrl}\n`);
    await updateProductImage(productId, imageUrl);
  } else {
    console.error('❌ Invalid arguments');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


