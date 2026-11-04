const { detectarTipo, validarContenido } = require('../src/config/multer');

describe('Validación del contenido de archivos', () => {
  test.each([
    ['application/pdf', Buffer.from('%PDF-1.7\n')],
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['image/webp', Buffer.from('RIFF0000WEBP')],
  ])('detecta %s por su firma binaria', (expected, buffer) => {
    expect(detectarTipo(buffer)).toBe(expected);
    expect(() => validarContenido({ buffer, mimetype: expected })).not.toThrow();
  });

  test('rechaza un ejecutable disfrazado de PDF', () => {
    expect(() => validarContenido({
      buffer: Buffer.from('MZ executable'),
      mimetype: 'application/pdf',
    })).toThrow('El contenido del archivo no coincide');
  });

  test('rechaza cuando MIME y contenido no coinciden', () => {
    expect(() => validarContenido({
      buffer: Buffer.from('%PDF-1.7\n'),
      mimetype: 'image/png',
    })).toThrow('El contenido del archivo no coincide');
  });
});
