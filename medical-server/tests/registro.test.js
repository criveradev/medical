const request = require('supertest');
const transporter = require('../src/config/email');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Paciente = require('../src/models/Paciente');
const CodigoRegistro = require('../src/models/CodigoRegistro');

const datos = {
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@example.test',
    rut: '12.345.678-5',
    password: 'Una clave segura',
    fechaNacimiento: '1990-01-02',
    genero: 'femenino',
};

async function codigoPara(email) {
    const envio = jest.spyOn(transporter, 'sendMail');
    try {
        const res = await request(app).post('/api/v1/registro/codigo').send({ email });
        expect(res.status).toBe(202);
        expect(res.body).not.toHaveProperty('codigo');
        const { html, text, attachments } = envio.mock.calls[0][0];
        const codigo = html.match(/<code\b[^>]*>([^<]+)<\/code>/)[1];
        expect(codigo).toMatch(/^[0-9]{6}$/);
        expect(text).toContain(codigo);
        expect(html).toContain(`src="cid:${attachments[0].cid}"`);
        expect(attachments[0].contentType).toBe('image/png');
        return codigo;
    } finally {
        envio.mockRestore();
    }
}

test('Rechaza códigos inválidos o emitidos para otro correo', async () => {
    const codigo = await codigoPara('otro@example.test');
    const res = await request(app).post('/api/v1/registro').send({ ...datos, codigo });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
});

test('Bloquea el código después de cinco intentos fallidos', async () => {
    const codigo = await codigoPara(datos.email);
    const incorrecto = codigo === '000000' ? '000001' : '000000';
    for (let intento = 0; intento < 5; intento++) {
        const res = await request(app).post('/api/v1/registro').send({ ...datos, codigo: incorrecto });
        expect(res.status).toBe(400);
    }
    const res = await request(app).post('/api/v1/registro').send({ ...datos, codigo });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
});

test('Rechaza un código vencido aunque MongoDB todavía no lo haya borrado', async () => {
    const codigo = await codigoPara(datos.email);
    await CodigoRegistro.updateOne({ _id: datos.email }, { venceEn: new Date(0) });
    const res = await request(app).post('/api/v1/registro').send({ ...datos, codigo });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
});

test('Informa un fallo de entrega sin exponer detalles del proveedor', async () => {
    const envio = jest.spyOn(transporter, 'sendMail')
        .mockRejectedValueOnce(new Error('Detalle privado del proveedor'));
    try {
        const res = await request(app).post('/api/v1/registro/codigo').send({ email: datos.email });
        expect(res.status).toBe(502);
        expect(res.body).toEqual({
            mensaje: 'No pudimos enviar el código de verificación. Intenta de nuevo más tarde.',
        });
    } finally {
        envio.mockRestore();
    }
});

const replicaSet = process.env.MONGO_TEST_URI?.includes('replicaSet=');
const testConTransacciones = replicaSet ? test : test.skip;

testConTransacciones('Crea una cuenta paciente y su ficha, y evita reclamar un RUT existente', async () => {
    await Role.create({ nombre: 'paciente', descripcion: 'Paciente' });
    const codigo = await codigoPara(datos.email);
    const res = await request(app).post('/api/v1/registro').send({ ...datos, codigo, roleId: 'administrador' });
    expect(res.status).toBe(201);

    const usuario = await User.findOne({ email: datos.email }).populate('roleId');
    expect(usuario.roleId.nombre).toBe('paciente');
    const paciente = await Paciente.findOne({ usuarioId: usuario._id });
    expect(paciente.rut).toBe('12345678-5');
    const reutilizado = await request(app).post('/api/v1/registro').send({ ...datos, codigo });
    expect(reutilizado.status).toBe(400);
    await Paciente.updateOne({ _id: paciente._id }, { rut: datos.rut });

    const email = 'otra-persona@example.test';
    const duplicado = await request(app).post('/api/v1/registro')
        .send({ ...datos, email, codigo: await codigoPara(email) });
    expect(duplicado.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
    expect(await Paciente.countDocuments()).toBe(1);
});
