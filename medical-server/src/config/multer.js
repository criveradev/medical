// ═══════════════════════════════════════════════════════════════
// src/config/multer.js — Validación multipart + subida a Cloudinary
// ═══════════════════════════════════════════════════════════════

const multer = require('multer');
const { cloudinary } = require('./cloudinary');

const TIPOS_RESULTADO = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const TIPOS_AVATAR = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function filtro(tipos, mensaje) {
  return (req, file, cb) => {
    if (tipos.includes(file.mimetype)) return cb(null, true);
    return cb(new Error(mensaje), false);
  };
}

function subirBuffer(buffer, opciones) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opciones, (error, resultado) => {
      if (error) return reject(error);
      return resolve(resultado);
    });
    stream.end(buffer);
  });
}

const detectarTipo = (buffer) => {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
};

const normalizarMime = (mime) => mime === 'image/jpg' ? 'image/jpeg' : mime;

const validarContenido = (file) => {
  const detectado = detectarTipo(file.buffer);
  if (!detectado || detectado !== normalizarMime(file.mimetype)) {
    const error = new Error('El contenido del archivo no coincide con un formato permitido');
    error.status = 400;
    throw error;
  }
  file.detectedMime = detectado;
};

function almacenamientoCloud(instanciaMulter, obtenerOpciones) {
  return {
    single(campo) {
      const recibir = instanciaMulter.single(campo);
      return (req, res, next) => {
        recibir(req, res, (error) => {
          if (error) return next(error);
          if (!req.file) return next();

          try {
            validarContenido(req.file);
          } catch (validationError) {
            return next(validationError);
          }

          subirBuffer(req.file.buffer, obtenerOpciones(req.file))
            .then((resultado) => {
              req.file.path = resultado.secure_url;
              req.file.filename = resultado.public_id;
              req.file.resourceType = resultado.resource_type;
              req.file.format = resultado.format;
              next();
            })
            .catch(next);
        });
      };
    },
  };
}

const resultadoMultipart = multer({
  storage: multer.memoryStorage(),
  fileFilter: filtro(TIPOS_RESULTADO, 'Solo se permiten archivos PDF, JPG y PNG'),
  limits: { fileSize: 5 * 1024 * 1024, fields: 12, files: 1 },
});

const avatarMultipart = multer({
  storage: multer.memoryStorage(),
  fileFilter: filtro(TIPOS_AVATAR, 'Solo se permiten imágenes JPG, PNG o WebP'),
  limits: { fileSize: 2 * 1024 * 1024, fields: 4, files: 1 },
});

const uploadResultado = almacenamientoCloud(resultadoMultipart, () => ({
  folder: 'medical-app/resultados',
  resource_type: 'image',
  type: 'authenticated',
  allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
  transformation: [{ quality: 'auto' }],
}));

const uploadAvatar = almacenamientoCloud(avatarMultipart, () => ({
  folder: 'medical-app/avatares',
  resource_type: 'image',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  transformation: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
}));

module.exports = { detectarTipo, uploadResultado, uploadAvatar, validarContenido };
