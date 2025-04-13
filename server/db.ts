import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema';
import { log } from './vite';

// Initialize connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set. Please add this secret in your deployment configuration.');
}

// Create database client
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Helper function to initialize the database
export async function initializeDatabase() {
  try {
    log('Initializing database...', 'DB');
    
    // You can add any initial setup logic here
    // For example, checking if tables exist, creating indexes, etc.
    
    log('Database initialized successfully', 'DB');
  } catch (error) {
    log(`Database initialization failed: ${error}`, 'DB');
    throw error;
  }
}