// ═══════════════════════════════════════════════════════════════
// src/config/swagger.js — Documentación API con Swagger
// ═══════════════════════════════════════════════════════════════

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Medical API',
      version:     '1.0.0',
      description: 'Contrato HTTP v1 del sistema de citas médicas'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.API_URL ? 'Servidor configurado' : 'Desarrollo local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'medical_access'
        }
      }
    },
    // Los clientes de servidor usan Bearer; el navegador usa cookie HttpOnly.
    security: [{ bearerAuth: [] }, { cookieAuth: [] }]
  },
  // Cada versión publica su propio contrato OpenAPI.
  apis: [path.join(__dirname, '../routes/v1/**/*.js')]
};

module.exports = swaggerJsdoc(options);
