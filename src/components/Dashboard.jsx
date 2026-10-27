import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PiggyBank, 
  Calendar, CreditCard, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Award, Gift, Edit3, Save, X, CheckSquare, Slash, Clock, Check, AlertCircle, Percent
} from 'lucide-react';

export default function Dashboard({ sales, expenses, deleteSale, deleteExpense, updateExpense, updateSale }) {
  const [filterType, setFilterType] = useState('month'); // day, week, month, all
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editImpact, setEditImpact] = useState('');

  // Helper date comparisons
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
  })();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const isInRange = (dateStr) => {
    const time = new Date(dateStr).getTime();
    if (filterType === 'day') return time >= startOfDay;
    if (filterType === 'week') return time >= startOfWeek;
    if (filterType === 'month') return time >= startOfMonth;
    return true; // all
  };

  const filteredSales = sales.filter(s => isInRange(s.date));
  const filteredExpenses = expenses.filter(e => isInRange(e.date));

  // Count sales that are NOT cancelled
  const activeSales = filteredSales.filter(s => s.status !== 'Cancelado');

  // Ingresos Brutos: ONLY count sales that are ALREADY PAID
  const totalSalesRevenue = activeSales
    .filter(s => s.paymentStatus === 'Pagado')
    .reduce((sum, s) => sum + parseFloat(s.totalCharged || 0), 0);
  
  // Accounts Receivable (Cuentas por Cobrar): sales that are PENDING payment
  const pendingCollection = activeSales
    .filter(s => s.paymentStatus === 'Pendiente')
    .reduce((sum, s) => sum + parseFloat(s.totalCharged || 0), 0);

  // Costs and outflows: ingredients/packaging consumed for all active scheduled or completed sales
  const salesProductionCost = activeSales.reduce((sum, s) => sum + parseFloat(s.totalCost || 0), 0);
  const additionalExpensesCost = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalOutflows = salesProductionCost + additionalExpensesCost;
  
  const netProfit = totalSalesRevenue - totalOutflows;
  const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;
  const recommendedSavings = netProfit > 0 ? netProfit * 0.20 : 0;

  // Today specific details (excluding cancelled sales)
  const todaySales = sales.filter(s => new Date(s.date).getTime() >= startOfDay && s.status !== 'Cancelado');
  const todayExpenses = expenses.filter(e => new Date(e.date).getTime() >= startOfDay);

  const todayPizzasCount = todaySales.reduce((sum, s) => sum + (s.quantity || 1), 0);
  
  const todayIngredients = todaySales.reduce((acc, s) => {
    s.ingredients.forEach(ing => {
      acc[ing.name] = (acc[ing.name] || 0) + (s.quantity || 1);
    });
    return acc;
  }, {});

  // Scheduled Orders (future orders: either 'Agendado' or 'En Preparacion')
  const scheduledOrders = sales
    .filter(s => (s.status === 'Agendado' || s.status === 'En Preparacion') && s.scheduledTime)
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  // Payment method statistics: ONLY count those that are PAID
  const paidSales = activeSales.filter(s => s.paymentStatus === 'Pagado');
  const paymentStats = paidSales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + parseFloat(s.totalCharged || 0);
    return acc;
  }, { Yape: 0, Plin: 0, Transferencia: 0, Efectivo: 0 });

  // Top Clients (calculating total pizzas purchased)
  const topClients = (() => {
    const currentMonthSales = sales.filter(s => new Date(s.date).getTime() >= startOfMonth && s.clientName && s.status !== 'Cancelado');
    const clientCounts = currentMonthSales.reduce((acc, s) => {
      const name = s.clientName.trim();
      if (!name) return acc;
      acc[name] = (acc[name] || 0) + (s.quantity || 1);
      return acc;
    }, {});

    return Object.entries(clientCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  // Merge & Sort transactions
  const transactions = [
    ...filteredSales.map(s => ({
      id: s.id,
      date: s.date,
      type: 'venta',
      description: `${s.quantity > 1 ? `(${s.quantity}x) ` : ''}Pizza ${s.pizzaName} ${s.ingredients.length > 0 ? '(con extras)' : ''} ${s.clientName ? `- Cliente: ${s.clientName}` : ''}`,
      amount: parseFloat(s.totalCharged || 0),
      cost: parseFloat(s.totalCost || 0),
      method: s.paymentMethod,
      status: s.status || 'Completado',
      paymentStatus: s.paymentStatus || 'Pagado',
      rawSale: s
    })),
    ...filteredExpenses.map(e => ({
      id: e.id,
      date: e.date,
      type: 'gasto',
      description: e.description,
      amount: parseFloat(e.amount || 0),
      cost: parseFloat(e.amount || 0),
      method: `Impacto: ${e.impact}`,
      status: 'Completado',
      paymentStatus: 'Pagado',
      rawExpense: e
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Weekly sales data points for clean bar chart
  const weeklyDataPoints = (() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        dateStr: d.toDateString(),
        label: days[d.getDay()],
        ing: 0,
        gast: 0
      };
    });

    paidSales.forEach(s => {
      const dStr = new Date(s.date).toDateString();
      const match = last7Days.find(day => day.dateStr === dStr);
      if (match) match.ing += parseFloat(s.totalCharged || 0);
    });

    filteredExpenses.forEach(e => {
      const dStr = new Date(e.date).toDateString();
      const match = last7Days.find(day => day.dateStr === dStr);
      if (match) match.gast += parseFloat(e.amount || 0);
    });

    activeSales.forEach(s => {
      const dStr = new Date(s.date).toDateString();
      const match = last7Days.find(day => day.dateStr === dStr);
      if (match) match.gast += parseFloat(s.totalCost || 0);
    });

    return last7Days;
  })();

  const maxWeeklyVal = Math.max(...weeklyDataPoints.map(p => Math.max(p.ing, p.gast)), 100);

  // Edit expense handler
  const startEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setEditDesc(exp.description);
    setEditAmount(exp.amount.toString());
    setEditImpact(exp.impact);
  };

  const saveExpense = async (id, originalDate) => {
    const updated = {
      id,
      date: originalDate,
      description: editDesc,
      amount: parseFloat(editAmount),
      impact: editImpact
    };
    await updateExpense(updated);
    setEditingExpenseId(null);
  };

  // Toggle sale status cancellation
  const toggleCancelSale = async (sale) => {
    const updatedStatus = sale.status === 'Cancelado' ? 'Completado' : 'Cancelado';
    const msg = updatedStatus === 'Cancelado' 
      ? '¿Estás seguro de cancelar esta venta? (No contará para ingresos/estadísticas ni fidelidad)' 
      : '¿Re-activar esta venta?';
    
    if (window.confirm(msg)) {
      await updateSale({
        ...sale,
        status: updatedStatus
      });
    }
  };

  // Toggle payment status (Pagado vs. Pendiente)
  const togglePaymentStatus = async (sale) => {
    const updatedPay = sale.paymentStatus === 'Pendiente' ? 'Pagado' : 'Pendiente';
    await updateSale({
      ...sale,
      paymentStatus: updatedPay
    });
  };

  // Update order prep status
  const startPreparingOrder = async (sale) => {
    await updateSale({
      ...sale,
      status: 'En Preparacion'
    });
  };

  const completeScheduledOrder = async (sale) => {
    if (window.confirm('¿Marcar como Entregado y completar pedido?')) {
      await updateSale({
        ...sale,
        status: 'Completado'
      });
    }
  };

  // Calculate SVG circular doughnut segments
  const totalPaymentSum = Object.values(paymentStats).reduce((a, b) => a + b, 0) || 1;
  const yapePct = (paymentStats.Yape / totalPaymentSum);
  const plinPct = (paymentStats.Plin / totalPaymentSum);
  const transPct = (paymentStats.Transferencia / totalPaymentSum);
  const cashPct = (paymentStats.Efectivo / totalPaymentSum);

  // Concentric ring radii
  const ringRadiusYape = 45;
  const ringRadiusPlin = 35;
  const ringRadiusTrans = 25;
  const ringRadiusCash = 15;

  const getCircumference = (r) => 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Time Filter Selection bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
          <button className={`nav-btn ${filterType === 'day' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }} onClick={() => setFilterType('day')}>Hoy</button>
          <button className={`nav-btn ${filterType === 'week' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }} onClick={() => setFilterType('week')}>Esta Semana</button>
          <button className={`nav-btn ${filterType === 'month' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }} onClick={() => setFilterType('month')}>Este Mes</button>
          <button className={`nav-btn ${filterType === 'all' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }} onClick={() => setFilterType('all')}>Todo</button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel stat-card ingresos">
          <div className="stat-header">
            <span>INGRESOS COBRADOS</span>
            <div className="stat-icon-wrapper"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-value">S/. {totalSalesRevenue.toFixed(2)}</div>
        </div>

        <div className="glass-panel stat-card neto">
          <div className="stat-header">
            <span>GANANCIA NETA</span>
            <div className="stat-icon-wrapper"><DollarSign size={20} /></div>
          </div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            S/. {netProfit.toFixed(2)}
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="stat-header">
            <span>POR COBRAR (PENDIENTE)</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}><AlertCircle size={20} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>S/. {pendingCollection.toFixed(2)}</div>
        </div>

        <div className="glass-panel stat-card ahorro">
          <div className="stat-header">
            <span>MARGEN NETO %</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-info)' }}><Percent size={20} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-info)' }}>{netMarginPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Scheduled Orders (Pedidos Agendados) Panel */}
      {scheduledOrders.length > 0 && (
        <div className="glass-panel form-panel" style={{ padding: '1.5rem 2rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-info)' }}>
            <Clock size={20} />
            Pedidos Programados Activos ({scheduledOrders.length})
          </h3>
          
          <div className="pizza-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {scheduledOrders.map(order => {
              const orderTime = new Date(order.scheduledTime);
              const minutesLeft = Math.round((orderTime.getTime() - Date.now()) / 60000);
              const isUrgent = minutesLeft <= 30;
              const isPreparing = order.status === 'En Preparacion';

              return (
                <div 
                  key={order.id} 
                  className="glass-panel cost-item-card" 
                  style={{ 
                    flexDirection: 'column', 
                    alignItems: 'stretch', 
                    gap: '0.75rem',
                    border: isPreparing 
                      ? '1.5px solid var(--color-success)' 
                      : (isUrgent ? '1.5px solid var(--accent-pizza)' : '1px solid var(--border-color)'),
                    animation: (isUrgent && !isPreparing) ? 'pulse-glow 2s infinite ease-in-out' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span 
                        className="badge" 
                        style={{ 
                          background: isPreparing ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)', 
                          color: isPreparing ? 'var(--color-success)' : 'var(--color-info)',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        {isPreparing ? '👨‍🍳 EN PREPARACIÓN' : (isUrgent ? '⚠️ EMPEZAR YA' : 'AGENDADO')}
                      </span>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.4rem' }}>
                        ({order.quantity || 1}x) {order.pizzaName}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Cliente: <strong>{order.clientName || 'Sin Nombre'}</strong>
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>S/. {order.totalCharged.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <span>Hora entrega: <strong>{orderTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    <span style={{ fontWeight: 'bold' }}>
                      {minutesLeft > 0 ? `En ${minutesLeft} mins` : 'Atrasado!'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {!isPreparing ? (
                      <button 
                        onClick={() => startPreparingOrder(order)} 
                        className="btn-primary" 
                        style={{ padding: '0.4rem', flex: 1, fontSize: '0.8rem', background: 'var(--color-info-gradient)', boxShadow: 'none' }}
                      >
                        👨‍🍳 Preparar
                      </button>
                    ) : (
                      <button 
                        onClick={() => completeScheduledOrder(order)} 
                        className="btn-primary" 
                        style={{ padding: '0.4rem', flex: 1, fontSize: '0.8rem', background: 'var(--color-success-gradient)', boxShadow: 'none' }}
                      >
                        🚚 Entregar
                      </button>
                    )}
                    <button 
                      onClick={() => deleteSale(order.id)} 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                      title="Eliminar Pedido"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redesigned Clean Dashboard Widgets Grid */}
      <div className="dashboard-details" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* Redesigned Clean Bar Chart (Ventas vs Costos) */}
        <div className="glass-panel chart-panel" style={{ flex: 1.5 }}>
          <span className="chart-title">Balance Semanal de Caja (Ventas vs Costos)</span>
          
          <div style={{ display: 'flex', height: '180px', alignItems: 'flex-end', justifyContent: 'space-around', gap: '0.5rem', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {weeklyDataPoints.map((point, index) => {
              const ingPct = (point.ing / maxWeeklyVal) * 100;
              const gastPct = (point.gast / maxWeeklyVal) * 100;

              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                    {/* Sales bar (Green) */}
                    <div 
                      style={{ 
                        height: `${ingPct}%`, 
                        width: '16px', 
                        background: 'var(--color-success-gradient)', 
                        borderRadius: '4px 4px 0 0',
                        minHeight: point.ing > 0 ? '4px' : '0px',
                        transition: 'height 0.3s ease'
                      }} 
                      title={`Ingresos: S/. ${point.ing.toFixed(2)}`}
                    />
                    {/* Cost bar (Red) */}
                    <div 
                      style={{ 
                        height: `${gastPct}%`, 
                        width: '16px', 
                        background: 'var(--color-danger-gradient)', 
                        borderRadius: '4px 4px 0 0',
                        minHeight: point.gast > 0 ? '4px' : '0px',
                        transition: 'height 0.3s ease'
                      }} 
                      title={`Costos/Gastos: S/. ${point.gast.toFixed(2)}`}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)' }}>
              <span style={{ width: 8, height: 8, background: 'var(--color-success)', borderRadius: '50%' }} /> Ingresos Cobrados
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-danger)' }}>
              <span style={{ width: 8, height: 8, background: 'var(--color-danger)', borderRadius: '50%' }} /> Costos Totales
            </span>
          </div>
        </div>

        {/* Circular Concentric Rings Chart (Dashboard style) */}
        <div className="glass-panel chart-panel" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <span className="chart-title" style={{ width: '100%', alignSelf: 'flex-start' }}>Distribución de Métodos de Pago</span>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', width: '100%' }}>
            {/* SVG concentric dashboard rings */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg width="100%" height="100%" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r={ringRadiusYape} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                <circle 
                  cx="55" cy="55" r={ringRadiusYape} fill="none" 
                  stroke="#a855f7" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={getCircumference(ringRadiusYape)}
                  strokeDashoffset={getCircumference(ringRadiusYape) * (1 - yapePct)}
                  transform="rotate(-90 55 55)"
                />
                
                <circle cx="55" cy="55" r={ringRadiusPlin} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                <circle 
                  cx="55" cy="55" r={ringRadiusPlin} fill="none" 
                  stroke="#06b6d4" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={getCircumference(ringRadiusPlin)}
                  strokeDashoffset={getCircumference(ringRadiusPlin) * (1 - plinPct)}
                  transform="rotate(-90 55 55)"
                />

                <circle cx="55" cy="55" r={ringRadiusTrans} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                <circle 
                  cx="55" cy="55" r={ringRadiusTrans} fill="none" 
                  stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={getCircumference(ringRadiusTrans)}
                  strokeDashoffset={getCircumference(ringRadiusTrans) * (1 - transPct)}
                  transform="rotate(-90 55 55)"
                />

                <circle cx="55" cy="55" r={ringRadiusCash} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                <circle 
                  cx="55" cy="55" r={ringRadiusCash} fill="none" 
                  stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={getCircumference(ringRadiusCash)}
                  strokeDashoffset={getCircumference(ringRadiusCash) * (1 - cashPct)}
                  transform="rotate(-90 55 55)"
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                🍕
              </div>
            </div>

            {/* Doughnut Legends list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, background: '#a855f7', borderRadius: '50%' }} /> Yape:
                </span>
                <strong>{(yapePct * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, background: '#06b6d4', borderRadius: '50%' }} /> Plin:
                </span>
                <strong>{(plinPct * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} /> Transf:
                </span>
                <strong>{(transPct * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} /> Efectivo:
                </span>
                <strong>{(cashPct * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Today Activity Widget */}
      <div className="glass-panel form-panel" style={{ padding: '1.5rem 2rem' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CheckSquare size={20} color="var(--accent-pizza)" />
          Resumen de la Actividad de Hoy
        </h3>
        
        <div className="form-grid" style={{ gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              🍕 PRODUCTOS VENDIDOS HOY:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {todayPizzasCount} {todayPizzasCount === 1 ? 'Pizza Mediana' : 'Pizzas'}
              </div>
              {Object.keys(todayIngredients).length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  Extras / Toppings:
                  <ul style={{ listStyle: 'inside', marginTop: '0.25rem' }}>
                    {Object.entries(todayIngredients).map(([name, count]) => (
                      <li key={name}>{name} (x{count})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              💸 EGRESOS / GASTOS DE HOY:
            </span>
            <div className="cost-items-list" style={{ maxHeight: '120px' }}>
              {todayExpenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.25rem' }}>
                  <span>{exp.description}</span>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>S/. {exp.amount.toFixed(2)}</span>
                </div>
              ))}
              {todayExpenses.length === 0 && (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No se han registrado egresos fijos hoy.</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
