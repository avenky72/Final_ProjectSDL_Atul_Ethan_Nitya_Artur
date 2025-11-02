require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth.routes');

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);

// Helper function to create URL hash for deduplication
const createUrlHash = (url) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(url).digest('hex');
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all products with pagination and filters
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 24, category, brand, gender } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Add filter conditions
    if (category) {
      whereConditions.push(`c.slug = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (brand) {
      whereConditions.push(`p.brand_id = $${paramIndex}`);
      queryParams.push(parseInt(brand));
      paramIndex++;
    }

    if (gender) {
      whereConditions.push(`p.gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Add pagination params
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        array_agg(t.name) FILTER (WHERE t.name IS NOT NULL) as tag_names
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      ${whereClause}
      GROUP BY p.id, b.name, c.name
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get total count with same filters
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `, countParams);
    
    const total = parseInt(countResult.rows[0].total);

    res.json({
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        array_agg(t.name) FILTER (WHERE t.name IS NOT NULL) as tag_names
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, b.name, c.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create/Update product (for your crawler)
app.post('/api/products', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      title,
      description,
      brand_name,
      brand_website,
      category_slug,
      url,
      price,
      currency = 'USD',
      gender,
      colors = [],
      sizes = [],
      images = [],
      external_id,
      tags = []
    } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }

    const urlHash = createUrlHash(url);

    // Check if product already exists
    const existingProduct = await client.query(
      'SELECT id FROM products WHERE url_hash = $1',
      [urlHash]
    );

    if (existingProduct.rows.length > 0) {
      return res.json({ 
        message: 'Product already exists', 
        product_id: existingProduct.rows[0].id 
      });
    }

    // Get or create brand
    let brandId = null;
    if (brand_name) {
      const brandResult = await client.query(
        'INSERT INTO brands (name, website_url) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET website_url = EXCLUDED.website_url RETURNING id',
        [brand_name, brand_website]
      );
      brandId = brandResult.rows[0].id;
    }

    // Get category ID
    let categoryId = null;
    if (category_slug) {
      const categoryResult = await client.query(
        'SELECT id FROM categories WHERE slug = $1',
        [category_slug]
      );
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      }
    }

    // Insert product
    const productResult = await client.query(`
      INSERT INTO products (
        title, description, brand_id, category_id, url, url_hash,
        price, currency, gender, colors, sizes, images, external_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      title, description, brandId, categoryId, url, urlHash,
      price, currency, gender, JSON.stringify(colors), 
      JSON.stringify(sizes), JSON.stringify(images), external_id
    ]);

    const productId = productResult.rows[0].id;

    // Add tags if provided
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        const tagResult = await client.query(
          'INSERT INTO tags (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
          [tagName, tagName.toLowerCase().replace(/\s+/g, '-')]
        );
        
        let tagId;
        if (tagResult.rows.length > 0) {
          tagId = tagResult.rows[0].id;
        } else {
          // Tag already exists, get its ID
          const existingTag = await client.query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
          );
          tagId = existingTag.rows[0].id;
        }
        
        await client.query(
          'INSERT INTO product_tags (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [productId, tagId]
        );
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Product created successfully', 
      product_id: productId 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

// Bulk import products (for your crawler)
app.post('/api/products/bulk', async (req, res) => {
  const { products } = req.body;
  
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Products must be an array' });
  }

  const results = {
    created: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < products.length; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products[i])
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.message === 'Product already exists') {
          results.skipped++;
        } else {
          results.created++;
        }
      } else {
        results.errors.push({ index: i, error: result.error });
      }
    } catch (error) {
      results.errors.push({ index: i, error: error.message });
    }
  }

  res.json(results);
});

// Get brands
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get tags
app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ==================== NEW FILTER ENDPOINTS ====================

// Get unique genders from products
app.get('/api/filters/genders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT gender 
      FROM products 
      WHERE gender IS NOT NULL 
      ORDER BY gender
    `);
    res.json(result.rows.map(row => row.gender));
  } catch (error) {
    console.error('Error fetching genders:', error);
    res.status(500).json({ error: 'Failed to fetch genders' });
  }
});

// Get unique colors from products (from JSONB array)
app.get('/api/filters/colors', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT jsonb_array_elements_text(colors) as color
      FROM products
      WHERE colors IS NOT NULL
      ORDER BY color
    `);
    res.json(result.rows.map(row => row.color));
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// Get unique sizes from products (from JSONB array)
app.get('/api/filters/sizes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT jsonb_array_elements_text(sizes) as size
      FROM products
      WHERE sizes IS NOT NULL
      ORDER BY size
    `);
    res.json(result.rows.map(row => row.size));
  } catch (error) {
    console.error('Error fetching sizes:', error);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
});

// Get price range from products
app.get('/api/filters/price-range', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products
      WHERE price IS NOT NULL
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching price range:', error);
    res.status(500).json({ error: 'Failed to fetch price range' });
  }
});

app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
  console.log(`Brands API: http://localhost:${port}/api/brands`);
  console.log(`Categories API: http://localhost:${port}/api/categories`);
  console.log(`Filter APIs: /api/filters/genders, /api/filters/colors`);
});