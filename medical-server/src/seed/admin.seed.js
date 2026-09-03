// ═══════════════════════════════════════════════════════════════
// src/seed/admin.seed.js — Crea el usuario administrador inicial
// Ejecutar: npm run seed:admin
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const User     = require('../models/User');
const Role     = require('../models/Role');
require('dotenv').config();

async function seedAdmin () {
  const esProduccion = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL || (esProduccion ? '' : 'admin@medical.com');
  const password = process.env.ADMIN_INITIAL_PASSWORD || (esProduccion ? '' : 'Admin1234');

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD son obligatorios en producción');
  }
  const minimumLength = esProduccion ? 12 : 8;
  if (password.length < minimumLength || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(`ADMIN_INITIAL_PASSWORD debe tener al menos ${minimumLength} caracteres, letras y números`);
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medical_db';
  await mongoose.connect(uri);
  console.log('MongoDB conectado');

  const role = await Role.findOne({ nombre: 'administrador' });
  if (!role) {
    console.error('❌ Rol administrador no encontrado. Ejecuta primero: npm run seed:roles');
    process.exit(1);
  }

  const existe = await User.findOne({ email });
  if (existe) {
    console.log('⚠️  El administrador ya existe');
    await mongoose.disconnect();
    return;
  }

  await User.create({
    nombre:   'Admin',
    apellido: 'Sistema',
    email,
    password,
    roleId:   role._id
  });

  console.log('\n✅ Administrador creado');
  console.log(`   Email: ${email}`);
  console.log('   La contraseña inicial no se muestra en logs');

  await mongoose.disconnect();
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
