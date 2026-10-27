import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, Tag, Truck, Package, Edit3, Save, Award } from 'lucide-react';

export default function CostCalculator({ costs, setCosts, pizzas, setPizzas }) {
  // Cost items state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('ingrediente');

  // Inline editing state for Cost Items
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemPrice, setEditingItemPrice] = useState('');
  const [editingItemCategory, setEditingItemCategory] = useState('');

  // Pizza menu state
  const [newPizzaName, setNewPizzaName] = useState('');
  const [newPizzaPrice, setNewPizzaPrice] = useState('');
  const [editingPizzaId, setEditingPizzaId] = useState(null);
  const [editingPizzaPrice, setEditingPizzaPrice] = useState('');

  // Stamps Required setting
  const [stampsRequiredInput, setStampsRequiredInput] = useState(costs.stampsRequired || 5);

  // Cost items handlers
  const addCustomCost = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      cost: parseFloat(newItemPrice),
      category: newItemCategory,
    };

    try {
      const response = await fetch('/api/costs/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (response.ok) {
        const added = await response.json();
        setCosts(prev => ({
          ...prev,
          items: [...prev.items.filter(i => i.id !== added.id), added]
        }));
        setNewItemName('');
        setNewItemPrice('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemPrice(item.cost.toString());
    setEditingItemCategory(item.category);
  };

  const saveEditedItem = async (id) => {
    const updated = {
      id,
      name: editingItemName,
      cost: parseFloat(editingItemPrice),
      category: editingItemCategory
    };

    try {
      const response = await fetch('/api/costs/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        const saved = await response.json();
        setCosts(prev => ({
          ...prev,
          items: prev.items.map(item => item.id === id ? saved : item)
        }));
        setEditingItemId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCostItem = async (id) => {
    try {
      const response = await fetch(`/api/costs/items/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setCosts(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateDeliveryCost = async (val) => {
    const costVal = parseFloat(val) || 0;
    setCosts(prev => ({ ...prev, deliveryCost: costVal }));
    try {
      await fetch('/api/costs/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: costVal })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateStampsSetting = async (val) => {
    const stampsVal = parseInt(val, 10) || 5;
    setStampsRequiredInput(stampsVal);
    setCosts(prev => ({ ...prev, stampsRequired: stampsVal }));
    try {
      await fetch('/api/costs/stamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stamps: stampsVal })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Pizza Menu handlers
  const addPizza = async (e) => {
    e.preventDefault();
    if (!newPizzaName || !newPizzaPrice) return;

    try {
      const response = await fetch('/api/pizzas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPizzaName, price: parseFloat(newPizzaPrice) })
      });
      if (response.ok) {
        const added = await response.json();
        setPizzas([...pizzas, added]);
        setNewPizzaName('');
        setNewPizzaPrice('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePizza = async (id) => {
    if (!window.confirm('¿Eliminar este sabor de pizza del menú?')) return;
    try {
      const response = await fetch(`/api/pizzas/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPizzas(pizzas.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditPizza = (pizza) => {
    setEditingPizzaId(pizza.id);
    setEditingPizzaPrice(pizza.price.toString());
  };

  const savePizzaPrice = async (pizza) => {
    try {
      const response = await fetch(`/api/pizzas/${pizza.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pizza.name, price: parseFloat(editingPizzaPrice) })
      });
      if (response.ok) {
        const updated = await response.json();
        setPizzas(pizzas.map(p => p.id === updated.id ? updated : p));
        setEditingPizzaId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Settings configuration block */}
      <div className="glass-panel form-panel form-row-2" style={{ padding: '1.5rem 2rem', gap: '2rem' }}>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={18} className="stat-icon" style={{ color: 'var(--accent-pizza)' }} />
            Costo Estándar de Delivery (S/.)
          </label>
          <input 
            type="number" 
            step="0.10" 
            className="form-input" 
            value={costs.deliveryCost}
            onChange={e => updateDeliveryCost(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} className="stat-icon" style={{ color: 'var(--color-warning)' }} />
            Estampas necesarias para Pizza Gratis (6ta pizza = 5 estampas)
          </label>
          <input 
            type="number" 
            step="1" 
            className="form-input" 
            value={stampsRequiredInput}
            onChange={e => updateStampsSetting(e.target.value)}
          />
        </div>
      </div>

      {/* Upper Grid: Insumos Config */}
      <div className="form-grid">
        {/* Configuration Form */}
        <div className="glass-panel form-panel">
          <h2 className="logo-text" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Configurar Costo de Insumos y Capital
          </h2>
          <p className="header-subtitle" style={{ marginBottom: '1rem' }}>
            Registra el costo de tu masa precocida, ingredientes y empaques (stickers, sellos, cajas, etc.)
          </p>

          <form onSubmit={addCustomCost} className="form-panel" style={{ padding: 0, gap: '1.25rem' }}>
            <div className="form-group">
              <label>Nombre del Insumo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Jamón, Caja de Pizza, Sticker, Sello, Piña" 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Costo Unitario (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  placeholder="0.00" 
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select 
                  className="form-select"
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                >
                  <option value="base">Masa/Pizza Precocida (Base)</option>
                  <option value="ingrediente">Ingrediente Extra (Receta)</option>
                  <option value="empaque">Empaque/Extra (Cajas, Stickers, etc.)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <Plus size={18} /> Agregar Insumo
            </button>
          </form>
        </div>

        {/* Summary List with Inline Edit */}
        <div className="glass-panel form-panel">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} style={{ color: 'var(--accent-pizza)' }} />
            Lista de Insumos Activos
          </h3>

          <div className="cost-items-list">
            {costs.items.map((item) => (
              <div key={item.id} className="cost-item-card">
                {editingItemId === item.id ? (
                  <div className="cost-item-edit-form">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-input"
                        value={editingItemName}
                        onChange={e => setEditingItemName(e.target.value)}
                      />
                    </div>
                    <div className="cost-item-edit-row">
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="Costo S/."
                        value={editingItemPrice}
                        onChange={e => setEditingItemPrice(e.target.value)}
                      />
                      <select
                        className="form-select"
                        value={editingItemCategory}
                        onChange={e => setEditingItemCategory(e.target.value)}
                      >
                        <option value="base">Base</option>
                        <option value="ingrediente">Ingrediente</option>
                        <option value="empaque">Empaque</option>
                      </select>
                    </div>
                    <div className="cost-item-edit-actions">
                      <button className="btn-primary" onClick={() => saveEditedItem(item.id)}>
                        <Save size={15} /> Guardar
                      </button>
                      <button className="btn-secondary" onClick={() => setEditingItemId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="cost-item-info">
                      <span className="cost-item-name">{item.name}</span>
                      <span className="cost-item-cat">
                        {item.category === 'base' ? 'Masa Base' : item.category === 'ingrediente' ? 'Ingrediente' : 'Empaque'}
                      </span>
                    </div>
                    <div className="cost-item-actions">
                      <span className="cost-item-price">S/. {parseFloat(item.cost).toFixed(2)}</span>
                      <button
                        className="icon-btn"
                        onClick={() => startEditItem(item)}
                        style={{ color: 'var(--text-secondary)' }}
                        title="Editar"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => deleteCostItem(item.id)}
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Grid: Pizza Prices Config */}
      <div className="form-grid">
        {/* Add New Pizza Form */}
        <div className="glass-panel form-panel">
          <h2 className="logo-text" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Añadir Sabor de Pizza
          </h2>
          <p className="header-subtitle" style={{ marginBottom: '1.5rem' }}>
            Agrega nuevos sabores a tu carta estándar para que aparezcan en el formulario de ventas.
          </p>

          <form onSubmit={addPizza} className="form-panel" style={{ padding: 0, gap: '1.25rem' }}>
            <div className="form-group">
              <label>Sabor / Nombre de la Pizza</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Peperoni Especial, Vegetariana" 
                value={newPizzaName}
                onChange={e => setNewPizzaName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Precio de Venta Estándar (S/.)</label>
              <input 
                type="number" 
                step="0.50" 
                className="form-input" 
                placeholder="0.00" 
                value={newPizzaPrice}
                onChange={e => setNewPizzaPrice(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              <Plus size={18} /> Agregar al Menú
            </button>
          </form>
        </div>

        {/* Catalog list with inline pricing updates */}
        <div className="glass-panel form-panel">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={20} style={{ color: 'var(--accent-pizza)' }} />
            Carta de Pizzas y Edición de Precios
          </h3>

          <div className="cost-items-list" style={{ maxHeight: '420px' }}>
            {pizzas.map((pizza) => (
              <div key={pizza.id} className="cost-item-card">
                <div className="cost-item-info" style={{ flex: 1 }}>
                  <span className="cost-item-name">{pizza.name}</span>
                </div>

                <div className="cost-item-actions">
                  {editingPizzaId === pizza.id ? (
                    <>
                      <input
                        type="number"
                        step="0.50"
                        className="form-input"
                        style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.9rem' }}
                        value={editingPizzaPrice}
                        onChange={e => setEditingPizzaPrice(e.target.value)}
                      />
                      <button
                        className="icon-btn"
                        onClick={() => savePizzaPrice(pizza)}
                        style={{ color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', padding: '0.4rem' }}
                        title="Guardar"
                      >
                        <Save size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setEditingPizzaId(null)}
                        style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.4rem' }}
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="cost-item-price" style={{ minWidth: '60px', textAlign: 'right' }}>
                        S/. {parseFloat(pizza.price).toFixed(2)}
                      </span>
                      <button
                        className="icon-btn"
                        onClick={() => startEditPizza(pizza)}
                        style={{ color: 'var(--text-secondary)' }}
                        title="Editar precio"
                      >
                        <Edit3 size={15} />
                      </button>
                    </>
                  )}
                  <button
                    className="icon-btn"
                    onClick={() => deletePizza(pizza.id)}
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Eliminar pizza"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
