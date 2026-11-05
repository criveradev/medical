// ═══════════════════════════════════════════════════════════════
// src/seed/roles.seed.js — Carga inicial de roles en MongoDB
// Ejecutar: npm run seed:roles
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Role     = require('../models/Role');
require('dotenv').config();

const roles = [
  {
    nombre:      'administrador',
    descripcion: 'Acceso total a todos los módulos sin restricciones',
    permisos:    [] // tienePermiso() retorna true para admin directamente
  },
  {
    nombre:      'recepcionista',
    descripcion: 'Gestión de pacientes, citas y pagos',
    permisos: [
      { module: 'pacientes',  actions: ['crear', 'leer', 'editar'] },
      { module: 'citas',      actions: ['crear', 'leer', 'editar'] },
      { module: 'doctores',   actions: ['leer'] },
      { module: 'historial',  actions: ['leer'] },
      { module: 'pagos',      actions: ['crear', 'leer', 'editar'] }
    ]
  },
  {
    nombre:      'enfermero',
    descripcion: 'Registro de pacientes, calendario y lectura de historial',
    permisos: [
      { module: 'pacientes',  actions: ['crear', 'leer', 'editar'] },
      { module: 'calendario', actions: ['leer'] },
      { module: 'historial',  actions: ['leer'] },
      { module: 'resultados', actions: ['crear', 'leer'] }
    ]
  },
  {
    nombre:      'doctor',
    descripcion: 'Consulta de pacientes, historial clínico y reportes',
    permisos: [
      { module: 'pacientes',  actions: ['leer'] },
      { module: 'calendario', actions: ['leer'] },
      { module: 'citas',      actions: ['leer'] },
      { module: 'historial',  actions: ['crear', 'leer', 'editar'] },
      { module: 'resultados', actions: ['crear', 'leer', 'editar'] },
      { module: 'reportes',   actions: ['leer'] }
    ]
  },
  {
    nombre:      'paciente',
    descripcion: 'Acceso de solo lectura a sus propias citas, historial y resultados',
    permisos: [
      { module: 'citas',      actions: ['leer'] },
      { module: 'historial',  actions: ['leer'] },
      { module: 'pagos',      actions: ['leer'] },
      { module: 'resultados', actions: ['leer'] }
    ]
  }
];

async function seedRoles () {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medical_db';
  await mongoose.connect(uri);
  console.log('MongoDB conectado');

  for (const r of roles) {
    await Role.findOneAndUpdate({ nombre: r.nombre }, r, { upsert: true, returnDocument: 'after' });
    console.log(`✓ Rol "${r.nombre}" creado/actualizado`);
  }

  console.log('\n✅ Seed de roles completado');
  await mongoose.disconnect();
}

seedRoles().catch(err => { console.error(err); process.exit(1); });
