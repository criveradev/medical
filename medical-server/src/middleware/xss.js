// ═══════════════════════════════════════════════════════════════
// src/middleware/xss.js — Sanitización de inputs contra XSS
// ═══════════════════════════════════════════════════════════════

const sanitizeHtml = require('sanitize-html');

/**
 * Sanitiza recursivamente los strings de un valor (objeto/array/string),
 * eliminando todo HTML para prevenir XSS.
 * @param {*} obj - Valor a sanitizar.
 * @returns {*} El mismo valor con sus strings limpios de HTML.
 */
const sanitizarObjeto = (obj) => {
    if (typeof obj === 'string') {
        return sanitizeHtml(obj, { allowedTags: [], allowedAttributes: {} });
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizarObjeto);
    }
    if (typeof obj === 'object' && obj !== null) {
        const resultado = {};
        for (const key of Object.keys(obj)) {
            resultado[key] = sanitizarObjeto(obj[key]);
        }
        return resultado;
    }
    return obj;
};

/**
 * Middleware que sanitiza el body de la petición contra XSS (limpia HTML).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const xssSanitizer = (req, res, next) => {
    try {
        // Solo sanitizar body — query y params son de solo lectura en algunos casos
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizarObjeto(req.body);
        }
    } catch (error) {
        return next(error);
    }
    next();
};

module.exports = xssSanitizer;
