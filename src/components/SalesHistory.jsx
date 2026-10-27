import React, { useState, useEffect } from 'react';
import { Search, Trash2, Slash, Check, AlertCircle, Clock, Calendar, Filter, Edit2 } from 'lucide-react';

export default function SalesHistory({ sales, deleteSale, updateSale, onEditSale }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, Completado, Agendado, En Preparacion, Cancelado
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, Pagado, Pendiente
  const [timeFilter, setTimeFilter] = useState('weekly'); // weekly, monthly, all
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleTogglePayment = async (sale) => {
    const nextPay = sale.paymentStatus === 'Pendiente' ? 'Pagado' : 'Pendiente';
    await updateSale({
      ...sale,
      paymentStatus: nextPay
    });
  };

  const handleToggleCancel = async (sale) => {
    const nextStatus = sale.status === 'Cancelado' ? 'Completado' : 'Cancelado';
    const msg = nextStatus === 'Cancelado' 
      ? '¿Cancelar esta venta? (Se descontará de ganancias y estadísticas)' 
      : '¿Re-activar esta venta?';
    if (window.confirm(msg)) {
      await updateSale({
        ...sale,
        status: nextStatus
      });
    }
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, timeFilter]);

  const filteredSales = sales.filter(sale => {
    const clientMatch = (sale.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (sale.pizzaName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === 'all' || sale.status === statusFilter;
    const paymentMatch = paymentFilter === 'all' || sale.paymentStatus === paymentFilter;

    // Time filtering
    let timeMatch = true;
    const saleDate = new Date(sale.date).getTime();
    const now = new Date();

    if (timeFilter === 'weekly') {
      const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      timeMatch = saleDate >= oneWeekAgo;
    } else if (timeFilter === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      timeMatch = saleDate >= startOfMonth;
    }

    return clientMatch && statusMatch && paymentMatch && timeMatch;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search and Filters Bar */}
      <div className="glass-panel form-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem 1rem', flex: 2, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por cliente o pizza..." 
            className="form-input" 
            style={{ background: 'transparent', border: 'none', padding: 0, width: '100%' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flex: 1.5, minWidth: '380px' }}>
          <select 
            className="form-select" 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="weekly">📅 Esta Semana</option>
            <option value="monthly">🗓️ Este Mes</option>
            <option value="all">🌐 Todos los Tiempos</option>
          </select>

          <select 
            className="form-select" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="all">📊 Todos los Estados</option>
            <option value="Completado">🟢 Entregados (Listos)</option>
            <option value="Agendado">🔵 Agendados</option>
            <option value="En Preparacion">🟡 En Preparación</option>
            <option value="Cancelado">🔴 Cancelados</option>
          </select>

          <select 
            className="form-select" 
            value={paymentFilter} 
            onChange={e => setPaymentFilter(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="all">💵 Todos los Pagos</option>
            <option value="Pagado">🟢 Pagado</option>
            <option value="Pendiente">🟡 Pendiente</option>
          </select>
        </div>
      </div>

      {/* Sales Table Panel */}
      <div className="glass-panel table-panel" style={{ padding: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1.25rem' }}>Registro Histórico de Ventas ({filteredSales.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pizzas Pedidas</th>
                <th>Cant.</th>
                <th>Cobrado</th>
                <th>Método</th>
                <th>Pago</th>
                <th>Estado Pedido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale) => {
                const isCancelled = sale.status === 'Cancelado';
                const isPending = sale.paymentStatus === 'Pendiente';
                const formattedDate = new Date(sale.date).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={sale.id} style={isCancelled ? { opacity: 0.45, textDecoration: 'line-through' } : {}}>
                    <td style={{ color: 'var(--text-secondary)' }}>{formattedDate}</td>
                    <td style={{ fontWeight: 700 }}>{sale.clientName || 'Sin Nombre'}</td>
                    <td>{sale.pizzaName}</td>
                    <td><strong>{sale.quantity || 1}</strong></td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>S/. {sale.totalCharged.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${sale.paymentMethod.toLowerCase()}`}>{sale.paymentMethod}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input 
                          type="checkbox"
                          checked={!isPending}
                          onChange={() => handleTogglePayment(sale)}
                          disabled={isCancelled}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-success)' }}
                        />
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          color: isPending ? 'var(--color-warning)' : 'var(--color-success)'
                        }}>
                          {isPending ? 'Pendiente' : 'Pagado'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: sale.status === 'Completado' ? 'rgba(16,185,129,0.1)' : (sale.status === 'Cancelado' ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)'),
                        color: sale.status === 'Completado' ? 'var(--color-success)' : (sale.status === 'Cancelado' ? 'var(--color-danger)' : 'var(--color-info)')
                      }}>
                        {sale.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => onEditSale(sale)}
                          className="btn-secondary" 
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-info)' }}
                          title="Editar Pedido"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleToggleCancel(sale)}
                          className="btn-secondary" 
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-warning)' }}
                          title={isCancelled ? 'Re-activar Pedido' : 'Cancelar Pedido'}
                        >
                          <Slash size={14} />
                        </button>
                        <button 
                          onClick={() => deleteSale(sale.id)}
                          className="btn-secondary" 
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                          title="Eliminar Permanente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No se encontraron registros de ventas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mostrando registros <strong>{startIndex + 1}</strong> al <strong>{Math.min(startIndex + itemsPerPage, filteredSales.length)}</strong> de <strong>{filteredSales.length}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: activePage === 1 ? 'not-allowed' : 'pointer', opacity: activePage === 1 ? 0.5 : 1 }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                Página <strong>{activePage}</strong> de <strong>{totalPages}</strong>
              </span>
              <button 
                className="btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', opacity: activePage === totalPages ? 0.5 : 1 }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
