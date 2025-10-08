const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    
    // Read the schema file
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    console.log('Running database schema...');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('Database setup complete!');
    console.log('Tables created: brands, categories, tags, products, product_tags');
    console.log('Default categories and tags inserted');
    
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();