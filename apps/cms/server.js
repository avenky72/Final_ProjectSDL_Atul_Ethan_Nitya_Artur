require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth.routes');
const closetsRoutes = require('./routes/closets.routes');

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
app.use('/api/closets', closetsRoutes);

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

    const whereClause = whereConditions.length > 0 ?
      `WHERE ${whereConditions.join(' AND ')}` : '';

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

// Create or update product (bulk import support)
app.post('/api/products', async (req, res) => {
  try {
    const product = req.body;
    
    // Validate required fields
    if (!product.title || !product.url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }

    const urlHash = createUrlHash(product.url);

    // Check if product already exists by URL hash
    const existingProduct = await pool.query(
      'SELECT id FROM products WHERE url_hash = $1',
      [urlHash]
    );

    if (existingProduct.rows.length > 0) {
      return res.json({ 
        message: 'Product already exists', 
        id: existingProduct.rows[0].id,
        skipped: true
      });
    }

    // Get or create brand
    let brandId = null;
    if (product.brand_name) {
      const brandResult = await pool.query(
        'INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [product.brand_name]
      );
      brandId = brandResult.rows[0].id;
    }

    // Get or create category
    let categoryId = null;
    if (product.category_slug) {
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE slug = $1',
        [product.category_slug]
      );
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      }
    }

    // Insert product
    const result = await pool.query(`
      INSERT INTO products (
        title, description, brand_id, category_id, url, url_hash, 
        price, currency, gender, colors, sizes, images, external_id, in_stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      product.title,
      product.description || null,
      brandId,
      categoryId,
      product.url,
      urlHash,
      product.price || null,
      product.currency || 'USD',
      product.gender || null,
      product.colors ? JSON.stringify(product.colors) : null,
      product.sizes ? JSON.stringify(product.sizes) : null,
      product.images ? JSON.stringify(product.images) : null,
      product.external_id || null,
      product.in_stock !== undefined ? product.in_stock : true
    ]);

    // Handle tags if provided
    if (product.tags && Array.isArray(product.tags)) {
      for (const tagName of product.tags) {
        // Get or create tag
        const tagResult = await pool.query(
          'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [tagName]
        );
        const tagId = tagResult.rows[0].id;

        // Link product to tag
        await pool.query(
          'INSERT INTO product_tags (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [result.rows[0].id, tagId]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Bulk import products
app.post('/api/products/bulk', async (req, res) => {
  try {
    const products = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Expected an array of products' });
    }

    const results = {
      total: products.length,
      created: 0,
      skipped: 0,
      errors: 0
    };

    for (const product of products) {
      try {
        const response = await fetch('http://localhost:3001/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });

        const data = await response.json();
        
        if (data.skipped) {
          results.skipped++;
        } else {
          results.created++;
        }
      } catch (error) {
        console.error('Error importing product:', error);
        results.errors++;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error bulk importing:', error);
    res.status(500).json({ error: 'Failed to bulk import products' });
  }
});

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id
      ORDER BY b.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

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
  console.log(`Closets API: http://localhost:${port}/api/closets`);
  console.log(`Filter APIs: /api/filters/genders, /api/filters/colors`);
});