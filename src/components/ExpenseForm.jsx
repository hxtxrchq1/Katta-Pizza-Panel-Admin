import React, { useState } from 'react';
import { Landmark, AlertTriangle, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export default function ExpenseForm({ expenses = [], addExpense, deleteExpense, updateExpense }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [impact, setImpact] = useState('Bajo');

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editImpact, setEditImpact] = useState('Bajo');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    const expense = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      description,
      amount: parseFloat(amount),
      impact
    };

    addExpense(expense);

    setDescription('');
    setAmount('');
    setImpact('Bajo');
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditDescription(exp.description);
    setEditAmount(exp.amount.toString());
    setEditImpact(exp.impact || 'Bajo');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id, originalDate) => {
    if (!editDescription || !editAmount) return;
    await updateExpense({
      id,
      date: originalDate,
      description: editDescription,
      amount: parseFloat(editAmount),
      impact: editImpact
    });
    setEditingId(null);
  };

  const getImpactBadge = (imp) => {
    const styles = {
      Bajo: { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 },
      Medio: { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 },
      Alto: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }
    };
    return <span style={styles[imp] || styles.Bajo}>{imp}</span>;
  };

  // Sort expenses by date descending
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="form-grid">
        <div className="glass-panel form-panel">
          <h2 className="logo-text" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Registrar Gasto del Negocio
          </h2>
          <p className="header-subtitle" style={{ marginBottom: '1.5rem' }}>
            Registra egresos como alquiler, luz, gas, marketing, o cualquier compra no planificada para evaluar su impacto en tus ganancias.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label>Descripción del Gasto</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Gas balón, pago de luz, compra de stickers extra" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Monto del Gasto (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Impacto en el Presupuesto</label>
                <select 
                  className="form-select"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                >
                  <option value="Bajo">🟢 Bajo (Operativo diario/insumo menor)</option>
                  <option value="Medio">🟡 Medio (Servicios, publicidad)</option>
                  <option value="Alto">🔴 Alto (Alquiler, maquinaria, compras grandes)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
              <Plus size={18} /> Registrar Gasto
            </button>
          </form>
        </div>

        {/* Info & Guidelines Panel */}
        <div className="glass-panel form-panel" style={{ justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-warning)' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Control de Gastos Adicionales</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                El registro de egresos externos afecta directamente tu Ganancia Neta y Ahorros del día, semana y mes. 
                Mantener este registro actualizado te permite ver la salud real de tu tienda de pizzas.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-info)' }}>
              <Landmark size={24} />
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Cálculo de Ahorros Sugerido</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                La aplicación calcula un ahorro sugerido del 20% sobre tus ganancias netas reales. 
                Esto te ayudará a armar un fondo de reserva de capital para el crecimiento de la marca.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses History & Management Table */}
      <div className="glass-panel table-panel" style={{ padding: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1.25rem' }}>Historial y Gestión de Gastos ({sortedExpenses.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Fecha</th>
                <th style={{ width: '40%' }}>Descripción</th>
                <th style={{ width: '15%' }}>Impacto</th>
                <th style={{ width: '15%' }}>Monto</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((exp) => {
                const isEditing = editingId === exp.id;
                return (
                  <tr key={exp.id}>
                    <td>
                      {new Date(exp.date).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      ) : (
                        exp.description
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
                          value={editImpact}
                          onChange={(e) => setEditImpact(e.target.value)}
                        >
                          <option value="Bajo">Bajo</option>
                          <option value="Medio">Medio</option>
                          <option value="Alto">Alto</option>
                        </select>
                      ) : (
                        getImpactBadge(exp.impact || 'Bajo')
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.9rem', width: '100px' }}
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                      ) : (
                        `S/. ${parseFloat(exp.amount).toFixed(2)}`
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdate(exp.id, exp.date)}
                              className="action-btn text-success"
                              title="Guardar cambios"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="action-btn text-muted"
                              title="Cancelar edición"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(exp)}
                              className="action-btn text-info"
                              title="Editar gasto"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--color-info)' }}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="action-btn text-danger"
                              title="Eliminar gasto"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedExpenses.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No hay gastos registrados en el historial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
