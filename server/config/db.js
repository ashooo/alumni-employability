const mysql = require('mysql2');
const { PrismaClient } = require('@prisma/client');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alumni_tracer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  port: 3307
});

const db = pool.promise();
const prisma = new PrismaClient();

// Attach prisma to the db object for easy access in controllers
db.prisma = prisma;

module.exports = db;