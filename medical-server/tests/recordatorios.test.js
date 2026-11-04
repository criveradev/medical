const { DateTime } = require('luxon');

jest.mock('../src/services/email.service', () => ({
  enviarRecordatorioCita: jest.fn().mockResolvedValue(undefined),
}));

const { enviarRecordatorioCita } = require('../src/services/email.service');
const { ejecutarRecordatorios } = require('../src/services/recordatorios.service');
const { APP_TIME_ZONE } = require('../src/lib/fecha');
const Cita = require('../src/models/Cita');
const Departamento = require('../src/models/Departamento');
const Doctor = require('../src/models/Doctor');
const Especialidad = require('../src/models/Especialidad');
const Paciente = require('../src/models/Paciente');
const Role = require('../src/models/Role');
const User = require('../src/models/User');

describe('Recordatorios de citas', () => {
  test('marca cada cita enviada y no duplica el correo en una nueva ejecución', async () => {
    const [doctorRole, patientRole] = await Role.create([
      { nombre: 'doctor', descripcion: 'Doctor', permisos: [] },
      { nombre: 'paciente', descripcion: 'Paciente', permisos: [] },
    ]);
    const [doctorUser, patientUser] = await User.create([
      { nombre: 'Elena', apellido: 'Médica', email: 'doctor@reminder.test', password: 'Doctor1234', roleId: doctorRole._id },
      { nombre: 'Luis', apellido: 'Paciente', email: 'patient@reminder.test', password: 'Patient1234', roleId: patientRole._id },
    ]);
    const department = await Departamento.create({ nombre: 'Recordatorios' });
    const specialty = await Especialidad.create({ nombre: 'General', departamentoId: department._id });
    const doctor = await Doctor.create({
      usuarioId: doctorUser._id,
      especialidadId: specialty._id,
      matricula: 'REM-001',
      horarios: [],
    });
    const patient = await Paciente.create({
      usuarioId: patientUser._id,
      rut: '11111111-1',
      fechaNacimiento: '1990-01-01',
      genero: 'otro',
    });
    const appointment = await Cita.create({
      pacienteId: patient._id,
      doctorId: doctor._id,
      fechaHora: DateTime.now().setZone(APP_TIME_ZONE).plus({ days: 1 }).set({ hour: 10, minute: 0 }).toUTC().toJSDate(),
      motivo: 'Control preventivo',
    });

    await ejecutarRecordatorios();
    await ejecutarRecordatorios();

    expect(enviarRecordatorioCita).toHaveBeenCalledTimes(1);
    const stored = await Cita.findById(appointment._id).select('+recordatorioEnviadoAt +recordatorioClaimedAt');
    expect(stored.recordatorioEnviadoAt).toBeInstanceOf(Date);
    expect(stored.recordatorioClaimedAt).toBeNull();
  });
});
