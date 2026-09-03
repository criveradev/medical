// ═══════════════════════════════════════════════════════════════
// src/seed/catalogos.seed.js — Departamentos y especialidades
// Ejecutar: npm run seed:catalogos
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Departamento = require('../models/Departamento');
const Especialidad = require('../models/Especialidad');
require('dotenv').config();

const catalogos = [
  {
    nombre: 'Medicina Adulto',
    descripcion: 'Atención médica integral de pacientes adultos.',
    especialidades: [
      ['Medicina General', 'Atención primaria, prevención y diagnóstico inicial.'],
      ['Medicina Interna', 'Diagnóstico y tratamiento integral de enfermedades del adulto.'],
      ['Cardiología', 'Prevención, diagnóstico y tratamiento de enfermedades cardiovasculares.'],
      ['Gastroenterología', 'Atención de enfermedades del sistema digestivo.'],
      ['Endocrinología', 'Atención de trastornos hormonales y metabólicos.'],
      ['Neurología', 'Diagnóstico y tratamiento de enfermedades del sistema nervioso.'],
      ['Neumología', 'Atención de enfermedades respiratorias.'],
      ['Nefrología', 'Diagnóstico y tratamiento de enfermedades renales.'],
      ['Dermatología', 'Atención de enfermedades de la piel, cabello y uñas.']
    ]
  },
  {
    nombre: 'Cirugía',
    descripcion: 'Evaluación y tratamiento quirúrgico de distintas patologías.',
    especialidades: [
      ['Cirugía General', 'Evaluación y tratamiento quirúrgico general.'],
      ['Traumatología y Ortopedia', 'Atención de lesiones y enfermedades musculoesqueléticas.'],
      ['Urología', 'Atención del sistema urinario y aparato reproductor masculino.'],
      ['Otorrinolaringología', 'Atención de oído, nariz y garganta.'],
      ['Oftalmología', 'Diagnóstico y tratamiento de enfermedades de la visión.']
    ]
  },
  {
    nombre: 'Pediatría',
    descripcion: 'Atención integral de recién nacidos, niños y adolescentes.',
    especialidades: [
      ['Pediatría General', 'Control preventivo y atención médica infantil.'],
      ['Neonatología', 'Atención especializada de recién nacidos.']
    ]
  },
  {
    nombre: 'Salud de la Mujer',
    descripcion: 'Atención de la salud sexual, reproductiva y materna.',
    especialidades: [
      ['Ginecología', 'Prevención y tratamiento de enfermedades del sistema reproductor femenino.'],
      ['Obstetricia', 'Control del embarazo, parto y puerperio.']
    ]
  },
  {
    nombre: 'Salud Mental',
    descripcion: 'Prevención, evaluación y tratamiento de la salud mental.',
    especialidades: [
      ['Psiquiatría', 'Diagnóstico y tratamiento médico de trastornos de salud mental.'],
      ['Psicología Clínica', 'Evaluación e intervención psicológica clínica.']
    ]
  },
  {
    nombre: 'Diagnóstico y Apoyo Clínico',
    descripcion: 'Servicios especializados de diagnóstico y apoyo terapéutico.',
    especialidades: [
      ['Radiología', 'Diagnóstico mediante técnicas de imagen.'],
      ['Anestesiología', 'Evaluación y manejo anestésico perioperatorio.'],
      ['Medicina Física y Rehabilitación', 'Recuperación funcional y manejo de discapacidad.']
    ]
  }
];

async function seedCatalogos () {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medical_db';
  await mongoose.connect(uri);
  console.log('MongoDB conectado');

  try {
    let totalEspecialidades = 0;

    for (const catalogo of catalogos) {
      const departamento = await Departamento.findOneAndUpdate(
        { nombre: catalogo.nombre },
        {
          nombre: catalogo.nombre,
          descripcion: catalogo.descripcion,
          activo: true
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );

      console.log(`✓ Departamento "${departamento.nombre}" creado/actualizado`);

      for (const [nombre, descripcion] of catalogo.especialidades) {
        await Especialidad.findOneAndUpdate(
          { nombre },
          {
            nombre,
            descripcion,
            departamentoId: departamento._id,
            activo: true
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        totalEspecialidades += 1;
        console.log(`  ✓ Especialidad "${nombre}" creada/actualizada`);
      }
    }

    console.log(`\n✅ Seed completado: ${catalogos.length} departamentos y ${totalEspecialidades} especialidades`);
  } finally {
    await mongoose.disconnect();
  }
}

seedCatalogos().catch(err => {
  console.error('❌ Error al ejecutar el seed de catálogos:', err);
  process.exit(1);
});
