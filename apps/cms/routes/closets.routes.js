// apps/cms/routes/closets.routes.js
const express = require('express');
const { Pool } = require('pg');
const SupabaseAuthController = require('../auth-supabase.controller');

const router = express.Router();
const authController = new SupabaseAuthController();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to require authentication for all routes
router.use((req, res, next) => authController.requireAuth(req, res, next));

// ========== CLOSET ROUTES ==========

// Get all closets for the logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as outfit_count
      FROM user_closets c
      LEFT JOIN outfits o ON c.id = o.closet_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({ closets: result.rows });
  } catch (error) {
    console.error('Error fetching closets:', error);
    res.status(500).json({ error: 'Failed to fetch closets' });
  }
});

// Get single closet with its outfits
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get closet
    const closetResult = await pool.query(`
      SELECT * FROM user_closets
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (closetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Closet not found' });
    }

    // Get outfits in this closet
    const outfitsResult = await pool.query(`
      SELECT 
        o.*,
        COUNT(op.id) as product_count
      FROM outfits o
      LEFT JOIN outfit_products op ON o.id = op.outfit_id
      WHERE o.closet_id = $1 AND o.user_id = $2
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [id, userId]);

    res.json({
      closet: closetResult.rows[0],
      outfits: outfitsResult.rows
    });
  } catch (error) {
    console.error('Error fetching closet:', error);
    res.status(500).json({ error: 'Failed to fetch closet' });
  }
});

// Create new closet
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, is_public, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Closet name is required' });
    }

    const result = await pool.query(`
      INSERT INTO user_closets (user_id, name, description, is_public, cover_image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, name, description || null, is_public || false, cover_image || null]);

    res.status(201).json({ closet: result.rows[0] });
  } catch (error) {
    console.error('Error creating closet:', error);
    res.status(500).json({ error: 'Failed to create closet' });
  }
});

// Update closet
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, description, is_public, cover_image } = req.body;

    const result = await pool.query(`
      UPDATE user_closets
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_public = COALESCE($3, is_public),
        cover_image = COALESCE($4, cover_image),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [name, description, is_public, cover_image, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Closet not found' });
    }

    res.json({ closet: result.rows[0] });
  } catch (error) {
    console.error('Error updating closet:', error);
    res.status(500).json({ error: 'Failed to update closet' });
  }
});

// Delete closet
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM user_closets
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Closet not found' });
    }

    res.json({ success: true, message: 'Closet deleted' });
  } catch (error) {
    console.error('Error deleting closet:', error);
    res.status(500).json({ error: 'Failed to delete closet' });
  }
});

// ========== OUTFIT ROUTES ==========

// Get single outfit with products
router.get('/:closetId/outfits/:outfitId', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId, outfitId } = req.params;

    // Get outfit
    const outfitResult = await pool.query(`
      SELECT o.* FROM outfits o
      JOIN user_closets c ON o.closet_id = c.id
      WHERE o.id = $1 AND o.closet_id = $2 AND c.user_id = $3
    `, [outfitId, closetId, userId]);

    if (outfitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    // Get products in this outfit
    const productsResult = await pool.query(`
      SELECT 
        p.*,
        op.position,
        b.name as brand_name,
        c.name as category_name
      FROM outfit_products op
      JOIN products p ON op.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE op.outfit_id = $1
      ORDER BY op.position, op.id
    `, [outfitId]);

    res.json({
      outfit: outfitResult.rows[0],
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Error fetching outfit:', error);
    res.status(500).json({ error: 'Failed to fetch outfit' });
  }
});

// Create new outfit
router.post('/:closetId/outfits', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Outfit name is required' });
    }

    // Verify closet belongs to user
    const closetCheck = await pool.query(`
      SELECT id FROM user_closets WHERE id = $1 AND user_id = $2
    `, [closetId, userId]);

    if (closetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Closet not found' });
    }

    const result = await pool.query(`
      INSERT INTO outfits (user_id, closet_id, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, closetId, name, description || null]);

    res.status(201).json({ outfit: result.rows[0] });
  } catch (error) {
    console.error('Error creating outfit:', error);
    res.status(500).json({ error: 'Failed to create outfit' });
  }
});

// Update outfit
router.put('/:closetId/outfits/:outfitId', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId, outfitId } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(`
      UPDATE outfits o
      SET 
        name = COALESCE($1, o.name),
        description = COALESCE($2, o.description),
        updated_at = NOW()
      FROM user_closets c
      WHERE o.id = $3 AND o.closet_id = $4 AND o.closet_id = c.id AND c.user_id = $5
      RETURNING o.*
    `, [name, description, outfitId, closetId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    res.json({ outfit: result.rows[0] });
  } catch (error) {
    console.error('Error updating outfit:', error);
    res.status(500).json({ error: 'Failed to update outfit' });
  }
});

// Delete outfit
router.delete('/:closetId/outfits/:outfitId', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId, outfitId } = req.params;

    const result = await pool.query(`
      DELETE FROM outfits o
      USING user_closets c
      WHERE o.id = $1 AND o.closet_id = $2 AND o.closet_id = c.id AND c.user_id = $3
      RETURNING o.*
    `, [outfitId, closetId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    res.json({ success: true, message: 'Outfit deleted' });
  } catch (error) {
    console.error('Error deleting outfit:', error);
    res.status(500).json({ error: 'Failed to delete outfit' });
  }
});

// Add product to outfit
router.post('/:closetId/outfits/:outfitId/products', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId, outfitId } = req.params;
    const { product_id, position } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify outfit belongs to user
    const outfitCheck = await pool.query(`
      SELECT o.id FROM outfits o
      JOIN user_closets c ON o.closet_id = c.id
      WHERE o.id = $1 AND o.closet_id = $2 AND c.user_id = $3
    `, [outfitId, closetId, userId]);

    if (outfitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    const result = await pool.query(`
      INSERT INTO outfit_products (outfit_id, product_id, position)
      VALUES ($1, $2, $3)
      ON CONFLICT (outfit_id, product_id) DO UPDATE
      SET position = EXCLUDED.position
      RETURNING *
    `, [outfitId, product_id, position || 0]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding product to outfit:', error);
    res.status(500).json({ error: 'Failed to add product to outfit' });
  }
});

// Remove product from outfit
router.delete('/:closetId/outfits/:outfitId/products/:productId', async (req, res) => {
  try {
    const userId = req.userId;
    const { closetId, outfitId, productId } = req.params;

    const result = await pool.query(`
      DELETE FROM outfit_products op
      USING outfits o, user_closets c
      WHERE op.outfit_id = $1 
        AND op.product_id = $2
        AND op.outfit_id = o.id
        AND o.closet_id = $3
        AND o.closet_id = c.id
        AND c.user_id = $4
      RETURNING op.*
    `, [outfitId, productId, closetId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found in outfit' });
    }

    res.json({ success: true, message: 'Product removed from outfit' });
  } catch (error) {
    console.error('Error removing product from outfit:', error);
    res.status(500).json({ error: 'Failed to remove product from outfit' });
  }
});

module.exports = router;