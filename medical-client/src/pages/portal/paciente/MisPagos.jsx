import { Download } from 'lucide-react';
import { useFetch } from '../../../hooks/useFetch';
import { PageHeader, Card, Spinner, ErrorMsg, Empty, Badge } from '../../../components/ui';
import { estadoPago, fmtFecha, clp } from '../../../lib/format';
import { imprimirVoucher, voucherDesdePago } from '../../../lib/voucher';

const metodoLabel = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', fonasa: 'Fonasa', isapre: 'Isapre',
};

/**
 * Página del paciente con sus propios pagos: listado y descarga del comprobante.
 * @returns {JSX.Element}
 */
export default function MisPagos() {
  const { data, loading, error } = useFetch('/pagos');
  const pagos = data?.pagos || [];

  return (
    <>
      <PageHeader title="Mis pagos" subtitle="Historial de pagos de tus consultas." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : pagos.length === 0 ? (
        <Card><Empty>No tienes pagos registrados.</Empty></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Concepto</th>
                <th className="px-5 py-3 font-medium">Método</th>
                <th className="px-5 py-3 font-medium">Monto</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{fmtFecha(p.createdAt)}</td>
                  <td className="px-5 py-3 text-slate-700">{p.citaId?.motivo || 'Consulta médica'}</td>
                  <td className="px-5 py-3 text-slate-600">{metodoLabel[p.metodo] || p.metodo}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{clp(p.monto)}</td>
                  <td className="px-5 py-3"><Badge color={estadoPago[p.estado] || 'slate'}>{p.estado}</Badge></td>
                  <td className="px-5 py-3">
                    <button onClick={() => imprimirVoucher(voucherDesdePago(p))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                      <Download size={13} /> Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
