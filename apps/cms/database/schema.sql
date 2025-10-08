-- Fashion Catalog Database Schema
-- This creates the basic structure - you can modify fields later

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    website_url TEXT,
    logo_url TEXT,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table 
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (flexible tagging system)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (main product storage)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    url_hash VARCHAR(64) UNIQUE, -- For deduplication
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    gender VARCHAR(20), -- 'men', 'women', 'unisex', or whatever you want
    colors JSONB, -- Array of color strings
    sizes JSONB, -- Array of size strings  
    images JSONB, -- Array of image URLs
    external_id VARCHAR(255), -- SKU or external ID from retailer
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS product_tags (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_url_hash ON products(url_hash);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Full-text search index (for searching product titles/descriptions)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- Insert some basic categories (you can modify these)
INSERT INTO categories (name, slug) VALUES 
    ('Tops', 'tops'),
    ('Bottoms', 'bottoms'),
    ('Shoes', 'shoes'),
    ('Accessories', 'accessories'),
    ('Outerwear', 'outerwear'),
    ('Dresses', 'dresses'),
    ('Bags', 'bags'),
    ('Jewelry', 'jewelry')
ON CONFLICT (name) DO NOTHING;

-- Insert some basic tags (you can modify these)
INSERT INTO tags (name, slug) VALUES 
    ('Casual', 'casual'),
    ('Formal', 'formal'),
    ('Streetwear', 'streetwear'),
    ('Vintage', 'vintage'),
    ('Minimalist', 'minimalist'),
    ('Bohemian', 'bohemian'),
    ('Athletic', 'athletic'),
    ('Luxury', 'luxury'),
    ('Summer', 'summer'),
    ('Winter', 'winter')
ON CONFLICT (name) DO NOTHING;