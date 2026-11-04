import { useState } from 'react';
import { Plus, Wallet, CheckCircle2, Ban, Printer, Activity, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../components/ui';
import { estadoPago, fmtFecha, clp } from '../../lib/format';
import { clinica } from '../../data/clinic';
import { imprimirVoucher, voucherDesdePago } from '../../lib/voucher';
import { useToast } from '../../context/ToastContext';

const METODOS = [
  ['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['transferencia', 'Transferencia'],
  ['fonasa', 'Fonasa'], ['isapre', 'Isapre'],
];
const vacio = { citaId: '', monto: '', metodo: 'efectivo', comprobante: '', observaciones: '' };
const fmtCita = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Fila clave/valor para el detalle de un pago.
 * @param {{k: import('react').ReactNode, v: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-500">{k}</dt>
    <dd className="text-right font-medium text-slate-800">{v}</dd>
  </div>
);

/**
 * Página de gestión de pagos (recepción/admin): registra pagos de citas, filtra,
 * muestra el total recaudado y permite descargar el comprobante.
 * @returns {JSX.Element}
 */
export default function Pagos() {
  const toast = useToast();
  const [fEstado, setFEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const qs = new URLSearchParams();
  if (fEstado) qs.set('estado', fEstado);
  if (desde) qs.set('desde', desde);
  if (hasta) qs.set('hasta', hasta);
  const { data, loading, error, reload } = useFetch(`/pagos${qs.toString() ? `?${qs.toString()}` : ''}`);
  const hayFiltros = fEstado || desde || hasta;
  const limpiar = () => { setFEstado(''); setDesde(''); setHasta(''); };

  const citasQ = useFetch('/citas?limit=100');
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacio);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [voucher, setVoucher] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar(e) {
    e.preventDefault();
    setErr('');
    const cita = (citasQ.data?.citas || []).find((c) => c._id === form.citaId);
    if (!cita) { setErr('Selecciona una cita.'); return; }
    setGuardando(true);
    try {
      const res = await api.post('/pagos', {
        citaId: form.citaId,
        pacienteId: cita.pacienteId?._id || cita.pacienteId,
        monto: Number(form.monto),
        metodo: form.metodo,
        comprobante: form.comprobante,
        observaciones: form.observaciones,
      });
      const pago = res.pago || {};
      setVoucher(voucherDesdePago({ ...pago, pacienteId: cita.pacienteId, citaId: cita }));
      setAbierto(false);
      setForm(vacio);
      toast.success('Pago registrado');
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function marcarPagado(id) {
    try { await api.put(`/pagos/${id}`, { estado: 'pagado' }); toast.success('Pago marcado como pagado'); reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function anular(id) {
    if (!confirm('¿Anular este pago?')) return;
    try { await api.put(`/pagos/${id}/anular`); toast.success('Pago anulado'); reload(); }
    catch (e) { toast.error(e.message); }
  }

  const pagos = data?.pagos || [];

  return (
    <>
      <PageHeader title="Pagos" subtitle="Cobros de las consultas médicas.">
        <Btn onClick={() => { setForm(vacio); setErr(''); setAbierto(true); }}>
          <Plus size={16} /> Registrar pago
        </Btn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Estado</label>
          <select className={inputCls + ' w-auto'} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <input type="date" className={inputCls + ' w-auto'} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <input type="date" className={inputCls + ' w-auto'} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {hayFiltros && <Btn variant="ghost" onClick={limpiar}>Limpiar</Btn>}
      </div>

      {!loading && !error && (
        <Card className="mb-4 flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet size={20} />
          </span>
          <div>
            <p className="text-sm text-slate-500">Total recaudado</p>
            <p className="text-xl font-semibold text-slate-900">{clp(data?.totalRecaudado)}</p>
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : pagos.length === 0 ? (
        <Card><Empty>No hay pagos registrados.</Empty></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Paciente</th>
                <th className="px-5 py-3 font-medium">Monto</th>
                <th className="px-5 py-3 font-medium">Método</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{fmtFecha(p.createdAt)}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {p.pacienteId?.usuarioId?.nombre} {p.pacienteId?.usuarioId?.apellido}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{clp(p.monto)}</td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{p.metodo}</td>
                  <td className="px-5 py-3"><Badge color={estadoPago[p.estado] || 'slate'}>{p.estado}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => imprimirVoucher(voucherDesdePago(p))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                        <Download size={13} /> Comprobante
                      </button>
                      {p.estado === 'pendiente' && (
                        <button onClick={() => marcarPagado(p._id)} className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50">
                          <CheckCircle2 size={13} /> Pagado
                        </button>
                      )}
                      {p.estado !== 'anulado' && (
                        <button onClick={() => anular(p._id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                          <Ban size={13} /> Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Registrar pago">
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <Field label="Cita">
            <select className={inputCls} value={form.citaId} onChange={(e) => set('citaId', e.target.value)} required>
              <option value="">Selecciona…</option>
              {(citasQ.data?.citas || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {fmtCita(c.fechaHora)} · {c.pacienteId?.usuarioId?.nombre} {c.pacienteId?.usuarioId?.apellido} · {c.motivo}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto">
              <input type="number" min="0" step="100" className={inputCls} value={form.monto} onChange={(e) => set('monto', e.target.value)} required />
            </Field>
            <Field label="Método">
              <select className={inputCls} value={form.metodo} onChange={(e) => set('metodo', e.target.value)}>
                {METODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Comprobante">
            <input className={inputCls} value={form.comprobante} onChange={(e) => set('comprobante', e.target.value)} placeholder="N° de boleta o referencia" />
          </Field>
          <Field label="Observaciones">
            <textarea className={inputCls} rows={2} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={!!voucher} onClose={() => setVoucher(null)} title="Pago registrado">
        {voucher && (
          <div>
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Activity size={18} strokeWidth={2.4} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{clinica.nombre}</p>
                  <p className="text-xs text-slate-500">Comprobante de pago</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row k="N° comprobante" v={voucher.numero} />
                <Row k="Fecha" v={voucher.fecha} />
                <Row k="Paciente" v={voucher.paciente || '—'} />
                <Row k="Atención" v={voucher.cita} />
                <Row k="Método" v={voucher.metodo} />
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-300 pt-3">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-semibold text-brand-700">{voucher.monto}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setVoucher(null)}>Cerrar</Btn>
              <Btn onClick={() => imprimirVoucher(voucher)}><Printer size={16} /> Imprimir / PDF</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
