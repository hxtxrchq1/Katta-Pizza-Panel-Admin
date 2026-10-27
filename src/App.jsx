import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, DollarSign, 
  Settings, Menu, X, Users, History 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import SaleForm from './components/SaleForm';
import CostCalculator from './components/CostCalculator';
import ExpenseForm from './components/ExpenseForm';
import ClientsList from './components/ClientsList';
import SalesHistory from './components/SalesHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [costs, setCosts] = useState({ deliveryCost: 6, stampsRequired: 5, items: [] });
  const [pizzas, setPizzas] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loyalty, setLoyalty] = useState({}); // Map of clientName -> manualPizzas count
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifiedOrderIds, setNotifiedOrderIds] = useState([]);
  const [editingSale, setEditingSale] = useState(null);

  // Fetch initial data from Supabase backend API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [costsRes, pizzasRes, salesRes, expensesRes, loyaltyRes] = await Promise.all([
        fetch('/api/costs').then(res => res.json()),
        fetch('/api/pizzas').then(res => res.json()),
        fetch('/api/sales').then(res => res.json()),
        fetch('/api/expenses').then(res => res.json()),
        fetch('/api/loyalty').then(res => res.json())
      ]);

      setCosts(costsRes);
      setPizzas(pizzasRes);
      setSales(salesRes);
      setExpenses(expensesRes);
      setLoyalty(loyaltyRes);
    } catch (err) {
      console.error('Error fetching data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Web Audio API Synthesizer to play warning sound
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (time, freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
      };
      playBeep(audioCtx.currentTime, 880);
      playBeep(audioCtx.currentTime + 0.3, 880);
    } catch (e) {
      console.log('Audio Context blocked or unsupported', e);
    }
  };

  // Monitor scheduled orders and notify 30 minutes before
  useEffect(() => {
    if (sales.length === 0) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      
      sales.forEach(sale => {
        if (sale.status === 'Agendado' && sale.scheduledTime) {
          const orderTimeMs = new Date(sale.scheduledTime).getTime();
          const msLeft = orderTimeMs - nowMs;
          const minutesLeft = msLeft / 60000;
          
          if (minutesLeft > 0 && minutesLeft <= 30 && !notifiedOrderIds.includes(sale.id)) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 Katta Pizza - Pedido Próximo!', {
                body: `Preparar pizza ${sale.pizzaName} para ${sale.clientName || 'Cliente'}. Entrega en ${Math.round(minutesLeft)} minutos.`,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍕</text></svg>'
              });
            }
            // Send native mobile notification via free ntfy.sh service
            fetch('https://ntfy.sh/kattapizza_914754513', {
              method: 'POST',
              body: `Preparar pizza ${sale.pizzaName} para ${sale.clientName || 'Cliente'}. Entrega en ${Math.round(minutesLeft)} mins.`,
              headers: {
                'Title': '🚨 Katta Pizza - Preparar Pedido',
                'Priority': 'high',
                'Tags': 'pizza,warning,alarm_clock',
                'Icon': 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png'
              }
            }).catch(err => console.log('Error sending phone push:', err));

            playAlertSound();
            alert(`🚨 ALERTA KATTA PIZZA: Faltan ${Math.round(minutesLeft)} minutos para entregar la pizza ${sale.pizzaName} de ${sale.clientName || 'Cliente'}!`);
            setNotifiedOrderIds(prev => [...prev, sale.id]);
          }
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [sales, notifiedOrderIds]);

  // Operations handlers
  const addSale = async (sale) => {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });
      if (response.ok) {
        await fetchData(); // refresh stats
        if (sale.status === 'Agendado') {
          fetch('https://ntfy.sh/kattapizza_914754513', {
            method: 'POST',
            body: `Nuevo pedido agendado: ${sale.pizzaName} para ${sale.clientName || 'Cliente'} a las ${new Date(sale.scheduledTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}.`,
            headers: {
              'Title': '📅 Katta Pizza - Pedido Agendado',
              'Priority': 'default',
              'Tags': 'pizza,calendar',
              'Icon': 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png'
            }
          }).catch(err => console.log('Error confirmation push:', err));
        }
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Error adding sale:', err);
    }
  };

  const updateSale = async (sale) => {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error updating sale:', err);
    }
  };

  const addExpense = async (expense) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (response.ok) {
        await fetchData();
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  const updateExpense = async (expense) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error updating expense:', err);
    }
  };

  const updateLoyalty = async (clientName, manualPizzas) => {
    try {
      const response = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, manualPizzas })
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error updating loyalty count:', err);
    }
  };

  const deleteSale = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta venta del registro de forma permanente?')) return;
    try {
      const response = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error deleting sale:', err);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto del registro de forma permanente?')) return;
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', gap: '1.5rem' }}>
        <img src="/logo.jpg" alt="Logo" style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid var(--accent-pizza)', animation: 'float 2s infinite ease-in-out' }} />
        <div className="logo-text" style={{ fontSize: '1.5rem' }}>Cargando Katta Pizza...</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sincronizando con Supabase Database</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <span className="logo-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.jpg" alt="Katta Pizza Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--accent-pizza)' }} />
          Katta Pizza
        </span>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
        <div className="logo-section" style={{ gap: '0.75rem' }}>
          <img src="/logo.jpg" alt="Katta Pizza Logo" style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid var(--accent-pizza)' }} />
          <span className="logo-text" style={{ fontSize: '1.4rem' }}>Katta Pizza</span>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            >
              <LayoutDashboard className="nav-icon" /> Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'nueva-venta' ? 'active' : ''}`}
              onClick={() => { setEditingSale(null); setActiveTab('nueva-venta'); setIsMobileMenuOpen(false); }}
            >
              <ShoppingCart className="nav-icon" /> {editingSale ? 'Editar Pedido' : 'Nueva Venta'}
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'historial' ? 'active' : ''}`}
              onClick={() => { setActiveTab('historial'); setIsMobileMenuOpen(false); }}
            >
              <History className="nav-icon" /> Historial de Ventas
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'clientes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('clientes'); setIsMobileMenuOpen(false); }}
            >
              <Users className="nav-icon" /> Clientes y Fidelización
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'costos' ? 'active' : ''}`}
              onClick={() => { setActiveTab('costos'); setIsMobileMenuOpen(false); }}
            >
              <Settings className="nav-icon" /> Costos y Menú
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'gastos' ? 'active' : ''}`}
              onClick={() => { setActiveTab('gastos'); setIsMobileMenuOpen(false); }}
            >
              <DollarSign className="nav-icon" /> Registrar Gasto
            </button>
          </li>
        </ul>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>Katta Pizza v1.0.0</div>
          <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
            Supabase Online
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard de Control'}
              {activeTab === 'nueva-venta' && (editingSale ? 'Editar Pedido' : 'Registrar Pedido')}
              {activeTab === 'historial' && 'Historial Completo de Ventas'}
              {activeTab === 'clientes' && 'Clientes y Tarjetas de Fidelización'}
              {activeTab === 'costos' && 'Configuración de Insumos y Menú'}
              {activeTab === 'gastos' && 'Registro de Egresos'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'dashboard' && 'Estadísticas, ingresos, egresos y control de ahorros'}
              {activeTab === 'nueva-venta' && (editingSale ? 'Modifica los detalles, ingredientes y montos del pedido seleccionado' : 'Calcula costos de insumos, delivery y margen neto de la venta')}
              {activeTab === 'historial' && 'Busca, filtra, edita estado de pago o cancela pedidos efectuados'}
              {activeTab === 'clientes' && 'Monitorea las estampas acumuladas y consumo mensual de tus clientes'}
              {activeTab === 'costos' && 'Define el costo de la masa precocida, toppings, cajas y edita precios del menú'}
              {activeTab === 'gastos' && 'Controla los gastos adicionales de la tienda'}
            </p>
          </div>
        </header>

        {/* Tab Router Switch */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            sales={sales} 
            expenses={expenses} 
            deleteSale={deleteSale} 
            deleteExpense={deleteExpense} 
            updateExpense={updateExpense}
            updateSale={updateSale}
          />
        )}
        {activeTab === 'nueva-venta' && (
          <SaleForm 
            costs={costs} 
            pizzas={pizzas} 
            sales={sales}
            loyalty={loyalty}
            addSale={addSale} 
            editingSale={editingSale}
            setEditingSale={setEditingSale}
          />
        )}
        {activeTab === 'historial' && (
          <SalesHistory 
            sales={sales}
            deleteSale={deleteSale}
            updateSale={updateSale}
            onEditSale={(sale) => {
              setEditingSale(sale);
              setActiveTab('nueva-venta');
            }}
          />
        )}
        {activeTab === 'clientes' && (
          <ClientsList 
            sales={sales}
            loyalty={loyalty}
            updateLoyalty={updateLoyalty}
            stampsRequired={costs.stampsRequired}
          />
        )}
        {activeTab === 'costos' && (
          <CostCalculator 
            costs={costs} 
            setCosts={setCosts} 
            pizzas={pizzas}
            setPizzas={setPizzas}
          />
        )}
        {activeTab === 'gastos' && (
          <ExpenseForm 
            expenses={expenses}
            addExpense={addExpense} 
            deleteExpense={deleteExpense}
            updateExpense={updateExpense}
          />
        )}
      </main>
    </div>
  );
}
