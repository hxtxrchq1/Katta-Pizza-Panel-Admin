import React, { useState } from 'react';
import { Award, Gift, Search, Pizza, Sparkles, Smile, Edit3, Save, X } from 'lucide-react';

export default function ClientsList({ sales, stampsRequired, loyalty, updateLoyalty }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClientKey, setEditingClientKey] = useState(null);
  const [editCountVal, setEditCountVal] = useState('');

  const clientPurchases = sales.reduce((acc, sale) => {
    const name = sale.clientName?.trim();
    if (!name) return acc;
    
    const key = name.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        name,
        totalPurchases: 0,
        purchasesThisMonth: 0,
        lastPurchase: sale.date,
        pizzasDetails: {}
      };
    }
    
    if (sale.status !== 'Cancelado') {
      const qty = parseInt(sale.quantity || 1, 10);
      acc[key].totalPurchases += qty;
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      if (new Date(sale.date).getTime() >= startOfMonth) {
        acc[key].purchasesThisMonth += qty;
      }
      
      acc[key].pizzasDetails[sale.pizzaName] = (acc[key].pizzasDetails[sale.pizzaName] || 0) + qty;
    }

    if (new Date(sale.date).getTime() > new Date(acc[key].lastPurchase).getTime()) {
      acc[key].lastPurchase = sale.date;
    }

    return acc;
  }, {});

  const clientsArray = Object.values(clientPurchases).filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = (clientName, currentManual) => {
    setEditingClientKey(clientName.toLowerCase());
    setEditCountVal(currentManual.toString());
  };

  const saveLoyaltyCount = async (clientName) => {
    const newVal = parseInt(editCountVal, 10) || 0;
    await updateLoyalty(clientName, newVal);
    setEditingClientKey(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search Header */}
      <div className="glass-panel form-panel" style={{ padding: '1.25rem 2rem', flexDirection: 'row', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem 1rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar cliente por nombre o teléfono..." 
            className="form-input" 
            style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', fontSize: '0.95rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Total Clientes Registrados: <strong>{Object.keys(clientPurchases).length}</strong>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="pizza-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {clientsArray.map((client) => {
          const clientKey = client.name.toLowerCase();
          const manualOffset = loyalty[clientKey] || 0;
          
          const totalPurchasesWithManual = client.totalPurchases + manualOffset;
          const purchasesThisMonthWithManual = client.purchasesThisMonth + manualOffset;

          const stampsCount = purchasesThisMonthWithManual % (stampsRequired + 1);
          const hasFreePizza = purchasesThisMonthWithManual > 0 && purchasesThisMonthWithManual % stampsRequired === 0;

          return (
            <div key={client.name} className="glass-panel form-panel" style={{ gap: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Smile size={18} style={{ color: 'var(--accent-pizza)' }} />
                    {client.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Última compra: {new Date(client.lastPurchase).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                {hasFreePizza && (
                  <span className="badge" style={{ background: 'var(--color-warning)', color: '#000', fontWeight: 'bold' }}>
                    ¡GRATIS LISTA!
                  </span>
                )}
              </div>

              {/* Stamp Loyalty Card visualization */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  <span>Tarjeta de Estampas (Mes Actual):</span>
                  <strong>{stampsCount} / {stampsRequired}</strong>
                </div>
                
                {/* Visual Stamp Circles */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {Array.from({ length: stampsRequired }).map((_, i) => {
                    const isStamped = i < stampsCount;
                    return (
                      <div 
                        key={i} 
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          border: `2px ${isStamped ? 'solid' : 'dashed'} ${isStamped ? 'var(--color-warning)' : 'var(--border-color)'}`,
                          background: isStamped ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition-smooth)',
                          position: 'relative'
                        }}
                      >
                        {isStamped ? (
                          <Pizza size={18} color="var(--color-warning)" />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i + 1}</span>
                        )}
                      </div>
                    );
                  })}

                  {/* The 6th / Free Pizza slot */}
                  <div 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: `2px ${hasFreePizza ? 'solid' : 'dashed'} ${hasFreePizza ? 'var(--color-success)' : 'var(--border-color)'}`,
                      background: hasFreePizza ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: hasFreePizza ? 'pulse-glow 2s infinite ease-in-out' : 'none'
                    }}
                    title="Pizza Gratis"
                  >
                    <Gift size={18} color={hasFreePizza ? 'var(--color-success)' : 'var(--text-muted)'} />
                  </div>
                </div>
              </div>

              {/* Editable manual stamp adjustments */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                {editingClientKey === clientKey ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <label style={{ fontSize: '0.8rem' }}>Pizzas manuales extra:</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '70px', padding: '0.25rem', fontSize: '0.8rem' }}
                      value={editCountVal} 
                      onChange={e => setEditCountVal(e.target.value)}
                    />
                    <button 
                      onClick={() => saveLoyaltyCount(client.name)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }}
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={() => setEditingClientKey(null)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span>Histórico total: <strong>{totalPurchasesWithManual}</strong></span>
                    <button 
                      onClick={() => startEditing(client.name, manualOffset)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    >
                      <Edit3 size={12} /> Ajustar conteo
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {clientsArray.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se encontraron clientes con el término de búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
