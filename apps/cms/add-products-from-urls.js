// Add Products from URLs Script
// Usage: node add-products-from-urls.js <url1> <url2> ... OR node add-products-from-urls.js --file urls.txt
// This script scrapes product data from provided URLs and adds them to Supabase

require('dotenv').config();
const cheerio = require('cheerio');
const fs = require('fs');
const crypto = require('crypto');
// const Vibrant = require('node-vibrant/node'); // Temporarily disabled

const SUPABASE_URL = 'https://qqenztbtabitcxyilktl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY not found in .env file');
  process.exit(1);
}

function createUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

// Common selectors for different e-commerce sites
const SELECTORS = {
  title: [
    'h1[class*="product"]',
    'h1[class*="title"]',
    'h1.product-title',
    'h1',
    '[data-testid*="product-title"]',
    '[itemprop="name"]',
    'meta[property="og:title"]'
  ],
  description: [
    '[class*="product-description"]',
    '[class*="description"]',
    '[itemprop="description"]',
    'meta[name="description"]',
    'meta[property="og:description"]'
  ],
  price: [
    '[class*="price"]',
    '[class*="cost"]',
    '[itemprop="price"]',
    '[data-testid*="price"]',
    'meta[itemprop="price"]'
  ],
  images: [
    '[class*="product-image"] img',
    '[class*="gallery"] img',
    '[class*="carousel"] img',
    '[data-testid*="image"] img',
    'img[itemprop="image"]',
    'meta[property="og:image"]'
  ],
  colors: [
    '[class*="color"]',
    '[class*="swatch"]',
    '[data-attribute*="color"]'
  ],
  sizes: [
    '[class*="size"]',
    '[data-attribute*="size"]',
    'select[name*="size"] option'
  ]
};

async function fetchPage(url) {
  try {
    // Parse URL to get origin for Referer header
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': origin,
        'Origin': origin,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      // Add redirect handling
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`   Response status: ${response.status}`);
      console.error(`   Response headers:`, Object.fromEntries(response.headers.entries()));
      if (errorText) {
        console.error(`   Response body (first 500 chars):`, errorText.substring(0, 500));
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error.message.includes('403')) {
      throw new Error(`Failed to fetch ${url}: 403 Forbidden - Website is blocking automated requests. This site may require manual entry or a headless browser.`);
    }
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

// Helper function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractText($, selectors, defaultValue = null) {
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length) {
      // Try text content first
      let text = element.text().trim();
      if (text) return text;
      
      // Try content attribute for meta tags
      text = element.attr('content') || element.attr('value');
      if (text) return text.trim();
    }
  }
  return defaultValue;
}

function extractPrice($, selectors) {
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length) {
      let priceText = element.text().trim() || element.attr('content') || element.attr('value') || '';
      
      // Extract numeric value from price string
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/,/g, ''));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
  }
  return null;
}

function extractImages($, selectors, baseUrl) {
  const allImages = [];
  const whiteBgImages = [];
  const modelImages = [];
  
  // Collect all product images
  for (const selector of selectors) {
    const images = $(selector);
    
    for (let i = 0; i < images.length; i++) {
      const img = images.eq(i);
      let imgUrl = img.attr('src') || img.attr('data-src') || img.attr('content') || img.attr('data-lazy-src') || img.attr('data-original');
      
      if (imgUrl) {
        // Convert relative URLs to absolute
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            imgUrl = urlObj.origin + imgUrl;
          } catch (e) {
            continue;
          }
        }
        
        // Filter out small images, placeholders, logos, icons
        if (imgUrl && 
            imgUrl.startsWith('http') && 
            !imgUrl.includes('placeholder') &&
            !imgUrl.includes('logo') &&
            !imgUrl.includes('icon') &&
            !imgUrl.includes('avatar') &&
            !imgUrl.match(/\.(svg|ico)$/i)) {
          
          const imgUrlLower = imgUrl.toLowerCase();
          const imgAlt = (img.attr('alt') || '').toLowerCase();
          const imgClass = (img.attr('class') || '').toLowerCase();
          
          // Check if it's a white background image
          if (imgUrlLower.includes('white') || 
              imgUrlLower.includes('background') || 
              imgUrlLower.includes('flat') ||
              imgUrlLower.includes('_15') || // Common pattern for white bg images
              imgAlt.includes('white') ||
              imgClass.includes('white')) {
            whiteBgImages.push(imgUrl);
          }
          // Check if it's a model image
          else if (imgUrlLower.includes('model') || 
                   imgAlt.includes('model') ||
                   imgClass.includes('model')) {
            modelImages.push(imgUrl);
          }
          // Regular product image
          else {
            allImages.push(imgUrl);
          }
        }
      }
    }
  }
  
  // Priority: white background > regular images > model images
  if (whiteBgImages.length > 0) {
    return [whiteBgImages[0]]; // Return first white background image
  }
  if (allImages.length > 0) {
    return [allImages[0]]; // Return first regular image
  }
  if (modelImages.length > 0) {
    return [modelImages[0]]; // Fallback to model image if nothing else
  }
  
  return null; // No valid image found
}

function extractArray($, selectors) {
  const values = new Set();
  
  for (const selector of selectors) {
    $(selector).each((i, elem) => {
      const text = $(elem).text().trim() || $(elem).attr('title') || $(elem).attr('data-value') || $(elem).attr('data-color');
      
      if (text && text.length > 0 && text.length < 50) {
        // Filter out common non-color/size text
        const lowerText = text.toLowerCase();
        const excludePatterns = [
          'free shipping', 'sale', 'sold out', 'you may also like',
          'american express', 'apple pay', 'paypal', 'visa', 'mastercard',
          'discover', 'google pay', 'shop pay', 'venmo', 'ideal', 'bancontact',
          'diners club', 'model', 'choose', 'selection', 'refresh', 'window'
        ];
        
        const shouldExclude = excludePatterns.some(pattern => lowerText.includes(pattern));
        if (!shouldExclude) {
          values.add(text);
        }
      }
    });
  }
  
  return Array.from(values);
}

function inferCategory(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  // Category mapping based on keywords
  if (text.match(/\b(shirt|top|blouse|sweater|hoodie)\b/)) {
    return 1; // Tops
  }
  if (text.match(/\b(pants|jeans|trousers|shorts|skirt|bjeans)\b/)) {
    return 2; // Bottoms
  }
  if (text.match(/\b(jacket|coat|parka|blazer)\b/)) {
    return 5; // Outerwear
  }
  if (text.match(/\b(shoes|sneakers|boots|heels|sandals|slippers)\b/)) {
    return 3; // Shoes
  }
  if (text.match(/\b(bag|backpack|purse|handbag|tote|wallet)\b/)) {
    return 7; // Bags
  }
  if (text.match(/\b(dress|gown)\b/)) {
    return 6; // Dresses
  }
  if (text.match(/\b(necklace|ring|earring|bracelet|watch)\b/)) {
    return 8; // Jewelry
  }
  
  return 4; // Default to Accessories
}

function inferGender(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  if (text.match(/\b(women|womens|ladies|female)\b/)) {
    return 'women';
  }
  if (text.match(/\b(men|mens|male|guy)\b/)) {
    return 'men';
  }
  
  return 'unisex';
}

function extractBrandFromUrl(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Extract domain name (e.g., "protemoa.com" -> "protemoa")
    const parts = hostname.split('.');
    let brandName = parts[0];
    
    // Capitalize first letter and handle special cases
    brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    
    // Handle common brand name patterns
    // e.g., "protemoa" -> "Protémoa" (we'll keep it simple for now)
    // You can add more brand name mappings here if needed
    
    return brandName;
  } catch (error) {
    return 'Unknown';
  }
}

async function getOrCreateBrand(brandName) {
  try {
    // First, try to find existing brand (case-insensitive search)
    const searchResponse = await fetch(`${SUPABASE_URL}/rest/v1/brands?name=ilike.${encodeURIComponent(brandName)}&select=id,name`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (searchResponse.ok) {
      const existing = await searchResponse.json();
      if (existing.length > 0) {
        console.log(`   ✓ Brand: ${existing[0].name} (existing)`);
        return existing[0].id;
      }
    } else {
      // If ilike doesn't work, try exact match
      const exactResponse = await fetch(`${SUPABASE_URL}/rest/v1/brands?name=eq.${encodeURIComponent(brandName)}&select=id,name`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (exactResponse.ok) {
        const existing = await exactResponse.json();
        if (existing.length > 0) {
          console.log(`   ✓ Brand: ${existing[0].name} (existing)`);
          return existing[0].id;
        }
      }
    }

    // Brand doesn't exist, create it
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: brandName,
        website_url: null,
        logo_url: null,
        country: null
      })
    });

    if (createResponse.ok) {
      const newBrand = await createResponse.json();
      const brandId = Array.isArray(newBrand) ? newBrand[0].id : newBrand.id;
      console.log(`   ✓ Brand: ${brandName} (created)`);
      return brandId;
    } else {
      const error = await createResponse.text();
      console.error(`   ⚠️  Failed to create brand: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`   ⚠️  Error getting/creating brand: ${error.message}`);
    return null;
  }
}

async function extractColorFromImage(imageUrl) {
  try {
    if (!imageUrl) return null;
    
    console.log(`   🎨 Extracting color from image...`);
    
    // Use Vibrant to extract dominant colors from the image
    const palette = await Vibrant.from(imageUrl).getPalette();
    
    // Get the most vibrant color (Vibrant) or fallback to Muted
    const swatch = palette.Vibrant || palette.Muted || palette.LightVibrant || palette.DarkVibrant;
    
    if (swatch) {
      // Convert RGB to a color name or hex
      const rgb = swatch.rgb;
      const hex = `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
      
      // Try to get a color name from the hex
      const colorName = getColorName(rgb);
      
      console.log(`   ✓ Color: ${colorName} (${hex})`);
      return [colorName];
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️  Could not extract color from image: ${error.message}`);
    return null;
  }
}

function getColorName(rgb) {
  const [r, g, b] = rgb;
  
  // Simple color name mapping based on RGB values
  // This is a basic implementation - you could use a more sophisticated color library
  
  // Calculate brightness
  const brightness = (r + g + b) / 3;
  
  // Determine dominant color channel
  if (r > g && r > b) {
    // Red dominant
    if (brightness > 200) return 'light red';
    if (brightness < 50) return 'dark red';
    if (g > 150 && b > 150) return 'pink';
    return 'red';
  } else if (g > r && g > b) {
    // Green dominant
    if (brightness > 200) return 'light green';
    if (brightness < 50) return 'dark green';
    return 'green';
  } else if (b > r && b > g) {
    // Blue dominant
    if (brightness > 200) return 'light blue';
    if (brightness < 50) return 'dark blue';
    if (r > 150 && g > 150) return 'cyan';
    return 'blue';
  } else if (r === g && g === b) {
    // Grayscale
    if (brightness > 200) return 'white';
    if (brightness < 50) return 'black';
    if (brightness > 150) return 'light gray';
    return 'gray';
  } else if (r > 200 && g > 200 && b < 100) {
    return 'yellow';
  } else if (r > 200 && g > 150 && b < 100) {
    return 'orange';
  } else if (r > 150 && g < 100 && b > 150) {
    return 'purple';
  } else if (r > 150 && g > 100 && b < 100) {
    return 'brown';
  }
  
  // Fallback to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

async function scrapeProduct(url) {
  try {
    console.log(`\n🔍 Scraping: ${url}`);
    
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    
    // Extract product data
    const title = extractText($, SELECTORS.title) || 'Untitled Product';
    const description = extractText($, SELECTORS.description) || '';
    const price = extractPrice($, SELECTORS.price);
    const images = extractImages($, SELECTORS.images, url);
    const sizes = extractArray($, SELECTORS.sizes);
    
    // Extract brand from URL
    const brandName = extractBrandFromUrl(url);
    
    // Get or create brand
    const brand_id = await getOrCreateBrand(brandName);
    
    // Extract color from the first image if available (temporarily disabled)
    let colors = null;
    // if (images && images.length > 0) {
    //   const extractedColors = await extractColorFromImage(images[0]);
    //   if (extractedColors && extractedColors.length > 0) {
    //     colors = extractedColors;
    //   }
    // }
    
    // If no color from image, try HTML extraction as fallback
    // if (!colors || colors.length === 0) {
    //   const htmlColors = extractArray($, SELECTORS.colors);
    //   if (htmlColors.length > 0) {
    //     colors = htmlColors;
    //   }
    // }
    
    // Infer category and gender if not found
    const category_id = inferCategory(title, description);
    const gender = inferGender(title, description);
    
    // Extract currency from price text or default to USD
    let currency = 'USD';
    const priceElement = $(SELECTORS.price.join(', ')).first();
    if (priceElement.length) {
      const priceText = priceElement.text() || priceElement.attr('content') || '';
      if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR';
      if (priceText.includes('£') || priceText.includes('GBP')) currency = 'GBP';
      if (priceText.includes('¥') || priceText.includes('JPY')) currency = 'JPY';
    }
    
    const product = {
      title: title,
      description: description || null,
      url: url,
      price: price,
      currency: currency,
      gender: gender,
      colors: colors,
      sizes: sizes.length > 0 ? sizes : null,
      images: images && images.length > 0 ? images : null,
      category_id: category_id,
      brand_id: brand_id,
      in_stock: true
    };
    
    console.log(`   ✓ Title: ${title}`);
    console.log(`   ✓ Price: ${price ? `${currency} ${price}` : 'Not found'}`);
    console.log(`   ✓ Image: ${images && images.length > 0 ? images[0] : 'Not found'}`);
    console.log(`   ✓ Colors: ${colors && colors.length > 0 ? colors.join(', ') : 'None'}`);
    console.log(`   ✓ Sizes: ${sizes.length > 0 ? sizes.join(', ') : 'None'}`);
    console.log(`   ✓ Category: ${category_id} (inferred)`);
    console.log(`   ✓ Gender: ${gender} (inferred)`);
    
    return product;
  } catch (error) {
    console.error(`   ❌ Error scraping ${url}: ${error.message}`);
    return null;
  }
}

async function checkProductExists(url) {
  try {
    // Check by URL instead of url_hash since url_hash might not be exposed
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?url=eq.${encodeURIComponent(url)}&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const existing = await response.json();
      return existing.length > 0;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function addProductToSupabase(product) {
  try {
    // Check if product already exists
    const exists = await checkProductExists(product.url);
    if (exists) {
      console.log(`   ⏭️  Product already exists, skipping...`);
      return { success: false, skipped: true };
    }
    
    // Prepare product data (don't include url_hash - let database handle it)
    const productData = {
      ...product
    };
    
    // Add product
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      const result = await response.json();
      const productId = Array.isArray(result) ? result[0].id : result.id;
      console.log(`   ✅ Added to Supabase (ID: ${productId})`);
      return { success: true, productId };
    } else {
      const error = await response.text();
      console.error(`   ❌ Failed to add: ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`   ❌ Error adding to Supabase: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function processUrls(urls) {
  console.log(`\n📦 Processing ${urls.length} product URL(s)...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const url of urls) {
    try {
      // Add a small delay between requests to avoid rate limiting
      if (urls.indexOf(url) > 0) {
        await delay(1000); // 1 second delay between requests
      }
      
      // Validate URL
      if (!url || !url.startsWith('http')) {
        console.error(`❌ Invalid URL: ${url}`);
        errorCount++;
        continue;
      }
      
      // Scrape product data
      const product = await scrapeProduct(url);
      if (!product) {
        errorCount++;
        continue;
      }
      
      // Add to Supabase
      const result = await addProductToSupabase(product);
      if (result.success) {
        successCount++;
      } else if (result.skipped) {
        skippedCount++;
      } else {
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing ${url}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node add-products-from-urls.js <url1> <url2> ...');
    console.log('  node add-products-from-urls.js --file urls.txt');
    console.log('');
    console.log('Example:');
    console.log('  node add-products-from-urls.js https://example.com/product1 https://example.com/product2');
    process.exit(1);
  }
  
  let urls = [];
  
  // Check if --file flag is used
  if (args[0] === '--file' && args[1]) {
    try {
      const fileContent = fs.readFileSync(args[1], 'utf8');
      urls = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (error) {
      console.error(`❌ Error reading file ${args[1]}: ${error.message}`);
      process.exit(1);
    }
  } else {
    urls = args;
  }
  
  if (urls.length === 0) {
    console.error('❌ No URLs provided');
    process.exit(1);
  }
  
  await processUrls(urls);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

