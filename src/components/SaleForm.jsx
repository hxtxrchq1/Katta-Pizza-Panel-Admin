import React, { useState, useEffect } from 'react';
import { ShoppingBag, CreditCard, ChevronRight, Check, Award, Gift, Calendar, Pizza as PizzaIcon } from 'lucide-react';

export default function SaleForm({ costs, pizzas, sales, loyalty, addSale, editingSale, setEditingSale }) {
  const [clientName, setClientName] = useState('');
  const [pizzasThisMonth, setPizzasThisMonth] = useState(0);
  const [isFreePizzaApplied, setIsFreePizzaApplied] = useState(false);
  
  // Quantity of pizzas
  const [quantity, setQuantity] = useState(1);
  const activeQty = Math.max(1, parseInt(quantity, 10) || 1);

  // Dynamic array of selected pizzas config
  const [selectedPizzas, setSelectedPizzas] = useState([
    { pizzaId: pizzas[0]?.id || '', selectedIngredients: [], customPrice: '' }
  ]);

  // Scheduled order state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  
  // Payment status (Pagado vs. Pendiente)
  const [paymentStatus, setPaymentStatus] = useState('Pagado');
  
  const [useDelivery, setUseDelivery] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(costs?.deliveryCost || 6);
  const [paymentMethod, setPaymentMethod] = useState('Yape');
  const [chargedAmount, setChargedAmount] = useState(0);

  // Adjust selectedPizzas array when quantity changes
  useEffect(() => {
    const qty = activeQty;
    setSelectedPizzas(prev => {
      if (prev.length === qty) return prev;
      const currentList = [...prev];
      if (currentList.length < qty) {
        // Append missing pizzas
        const diff = qty - currentList.length;
        for (let i = 0; i < diff; i++) {
          currentList.push({
            pizzaId: pizzas[0]?.id || '',
            selectedIngredients: [],
            customPrice: ''
          });
        }
      } else if (currentList.length > qty) {
        // Remove trailing pizzas
        currentList.splice(qty);
      }
      return currentList;
    });
  }, [activeQty, pizzas]);

  // Base production cost of boxes/sticker/base dough per pizza
  const singlePizzaBaseCost = costs.items
    .filter(item => item.category === 'base' || item.category === 'empaque')
    .reduce((sum, item) => sum + parseFloat(item.cost || 0), 0);

  const ingredientInsumos = costs.items.filter(item => item.category === 'ingrediente');

  // Compute total production cost of all configured pizzas
  const totalProductionCost = selectedPizzas.reduce((acc, p) => {
    const ingredientsCost = p.selectedIngredients.reduce((sum, ingId) => {
      const item = costs.items.find(i => i.id === ingId);
      return sum + (item ? parseFloat(item.cost || 0) : 0);
    }, 0);
    return acc + singlePizzaBaseCost + ingredientsCost;
  }, 0);

  const totalCostWithDelivery = totalProductionCost + (useDelivery ? parseFloat(costs.deliveryCost || 0) : 0);

  // Monitor client purchases this month (sum quantity)
  useEffect(() => {
    if (!clientName.trim()) {
      setPizzasThisMonth(0);
      setIsFreePizzaApplied(false);
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Filter sales for this client in the current month (excluding cancelled ones)
    const clientSalesThisMonth = sales.filter(s => {
      const isSameClient = s.clientName && s.clientName.toLowerCase().trim() === clientName.toLowerCase().trim();
      const isThisMonth = new Date(s.date).getTime() >= startOfMonth;
      const isNotCancelled = s.status !== 'Cancelado';
      return isSameClient && isThisMonth && isNotCancelled;
    });

    const salesTotalQty = clientSalesThisMonth.reduce((sum, s) => sum + (s.quantity || 1), 0);
    const manualOffset = loyalty[clientName.toLowerCase().trim()] || 0;
    setPizzasThisMonth(salesTotalQty + manualOffset);
  }, [clientName, sales, loyalty]);

  const stampsRequired = costs?.stampsRequired || 5;
  const qualifiesForFree = pizzasThisMonth > 0 && pizzasThisMonth % stampsRequired === 0;

  // Recalculate default suggested charged amount
  useEffect(() => {
    if (isFreePizzaApplied) {
      // First pizza is free, rest are normal price
      let sumCharged = 0;
      selectedPizzas.forEach((p, idx) => {
        if (idx === 0) return; // Free
        const pizzaObj = pizzas.find(item => item.id === p.pizzaId);
        const basePrice = p.customPrice !== '' ? parseFloat(p.customPrice) : (pizzaObj?.price || 0);
        sumCharged += basePrice;
      });
      const extraDel = useDelivery ? parseFloat(deliveryCharge || 0) : 0;
      setChargedAmount(sumCharged + extraDel);
      return;
    }

    let sumCharged = 0;
    selectedPizzas.forEach(p => {
      const pizzaObj = pizzas.find(item => item.id === p.pizzaId);
      const basePrice = p.customPrice !== '' ? parseFloat(p.customPrice) : (pizzaObj?.price || 0);
      sumCharged += basePrice;
    });

    const extraDel = useDelivery ? parseFloat(deliveryCharge || 0) : 0;
    setChargedAmount(sumCharged + extraDel);
  }, [selectedPizzas, useDelivery, deliveryCharge, pizzas, isFreePizzaApplied]);

  // If scheduled is checked, set paymentStatus default to Pendiente
  useEffect(() => {
    if (isScheduled) {
      setPaymentStatus('Pendiente');
    } else {
      setPaymentStatus('Pagado');
    }
  }, [isScheduled]);

  // Load sale for editing or reset form when editingSale changes
  useEffect(() => {
    if (editingSale) {
      setClientName(editingSale.clientName || '');
      setQuantity(editingSale.quantity || 1);
      
      // Reconstruct selectedPizzas
      const names = (editingSale.pizzaName || '').split(' + ');
      const qty = editingSale.quantity || 1;
      
      const newSelectedPizzas = [];
      for (let i = 0; i < qty; i++) {
        const pName = names[i] || names[0] || '';
        const foundPizza = pizzas.find(p => p.name === pName) || pizzas[0];
        
        // Find ingredients for this specific pizza index (1-based in string "(Pizza X)")
        const pizzaIndexStr = `(Pizza ${i + 1})`;
        const selectedIngredients = [];
        if (Array.isArray(editingSale.ingredients)) {
          editingSale.ingredients.forEach(ing => {
            if (ing.name && ing.name.includes(pizzaIndexStr)) {
              // Extract original ingredient name before " (Pizza X)"
              const origName = ing.name.split(' (Pizza')[0].trim();
              const foundIng = costs.items.find(item => item.category === 'ingrediente' && item.name === origName);
              if (foundIng) {
                selectedIngredients.push(foundIng.id);
              }
            }
          });
        }
        
        newSelectedPizzas.push({
          pizzaId: foundPizza ? foundPizza.id : (pizzas[0]?.id || ''),
          selectedIngredients,
          customPrice: ''
        });
      }
      setSelectedPizzas(newSelectedPizzas);

      setIsScheduled(editingSale.status === 'Agendado');
      setScheduledDateTime(editingSale.scheduledTime ? editingSale.scheduledTime.substring(0, 16) : '');
      setPaymentStatus(editingSale.paymentStatus || 'Pagado');
      setUseDelivery(editingSale.deliveryCharged > 0);
      setDeliveryCharge(editingSale.deliveryCharged);
      setPaymentMethod(editingSale.paymentMethod || 'Yape');
      setChargedAmount(editingSale.totalCharged);
    } else {
      // Clear/Reset Form
      setClientName('');
      setIsFreePizzaApplied(false);
      setIsScheduled(false);
      setScheduledDateTime('');
      setPaymentStatus('Pagado');
      setQuantity(1);
      setSelectedPizzas([
        { pizzaId: pizzas[0]?.id || '', selectedIngredients: [], customPrice: '' }
      ]);
      setUseDelivery(false);
      setDeliveryCharge(costs?.deliveryCost || 6);
      setPaymentMethod('Yape');
      setChargedAmount(0);
    }
  }, [editingSale, pizzas, costs]);

  const updatePizzaSelection = (index, field, value) => {
    setSelectedPizzas(prev => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: value };
      return list;
    });
  };

  const handleIngredientToggle = (pizzaIndex, ingredientId) => {
    setSelectedPizzas(prev => {
      const list = [...prev];
      const p = list[pizzaIndex];
      const selected = p.selectedIngredients.includes(ingredientId)
        ? p.selectedIngredients.filter(id => id !== ingredientId)
        : [...p.selectedIngredients, ingredientId];
      
      list[pizzaIndex] = { ...p, selectedIngredients: selected };
      return list;
    });
  };

  const applyFreePizza = () => {
    setIsFreePizzaApplied(true);
    updatePizzaSelection(0, 'customPrice', '0');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPizzas.length === 0) return;

    // Build consolidated pizza names and ingredients list
    const pizzaNamesArray = [];
    const consolidatedIngredients = [];

    selectedPizzas.forEach((p, idx) => {
      const pizzaObj = pizzas.find(item => item.id === p.pizzaId) || { name: 'Margarita' };
      pizzaNamesArray.push(pizzaObj.name);

      p.selectedIngredients.forEach(ingId => {
        const item = costs.items.find(i => i.id === ingId);
        if (item) {
          consolidatedIngredients.push({
            name: `${item.name} (Pizza ${idx + 1})`,
            cost: item.cost
          });
        }
      });
    });

    const sale = {
      id: editingSale ? editingSale.id : Date.now().toString(),
      date: editingSale ? editingSale.date : new Date().toISOString(),
      pizzaId: selectedPizzas[0].pizzaId.toString(),
      pizzaName: pizzaNamesArray.join(' + '),
      pizzaPrice: selectedPizzas.reduce((sum, p) => {
        const pizzaObj = pizzas.find(item => item.id === p.pizzaId);
        return sum + (p.customPrice !== '' ? parseFloat(p.customPrice) : (pizzaObj?.price || 0));
      }, 0),
      ingredients: consolidatedIngredients,
      deliveryCharged: useDelivery ? parseFloat(deliveryCharge) : 0,
      totalCharged: parseFloat(chargedAmount),
      costOfProduction: totalProductionCost,
      costOfDelivery: useDelivery ? parseFloat(costs.deliveryCost) : 0,
      totalCost: totalCostWithDelivery,
      profit: parseFloat(chargedAmount) - totalCostWithDelivery,
      paymentMethod,
      clientName: clientName.trim(),
      status: isScheduled ? 'Agendado' : 'Completado',
      scheduledTime: isScheduled ? new Date(scheduledDateTime).toISOString() : null,
      paymentStatus: paymentStatus,
      quantity: activeQty
    };

    addSale(sale);
    if (setEditingSale) {
      setEditingSale(null);
    }

    // Reset Form
    setClientName('');
    setIsFreePizzaApplied(false);
    setIsScheduled(false);
    setScheduledDateTime('');
    setPaymentStatus('Pagado');
    setQuantity(1);
    setSelectedPizzas([
      { pizzaId: pizzas[0]?.id || '', selectedIngredients: [], customPrice: '' }
    ]);
  };

  return (
    <div className="form-grid" style={{ alignItems: 'flex-start' }}>
      {/* Venta Form */}
      <div className="glass-panel form-panel">
        <h2 className="logo-text" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          Registrar Nueva Venta
        </h2>
        <p className="header-subtitle" style={{ marginBottom: '1.5rem' }}>
          Define la cantidad de pizzas y personaliza cada una con sus propios ingredientes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label>Cantidad de Pizzas a preparar en esta orden</label>
            <input 
              type="number" 
              className="form-input" 
              style={{ fontSize: '1.15rem', fontWeight: 'bold' }}
              min="1"
              value={quantity}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setQuantity('');
                } else {
                  const parsed = parseInt(val, 10);
                  setQuantity(isNaN(parsed) ? '' : parsed);
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Nombre del Cliente</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nombre del cliente" 
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
            {clientName.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <Award size={16} color="var(--color-warning)" />
                <span>Pizzas compradas este mes: <strong>{pizzasThisMonth}</strong></span>
                {qualifiesForFree && !isFreePizzaApplied && (
                  <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>¡Califica para la pizza gratis!</span>
                )}
              </div>
            )}

            {qualifiesForFree && !isFreePizzaApplied && (
              <div className="loyalty-banner">
                <Gift size={20} color="var(--color-warning)" />
                <div style={{ flex: 1, fontSize: '0.85rem' }}>
                  <strong>¡Cliente Frecuente!</strong> Califica para la pizza gratis este mes.
                </div>
                <button 
                  type="button" 
                  onClick={applyFreePizza}
                  className="btn-primary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--color-warning)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Aplicar Gratis
                </button>
              </div>
            )}
            {isFreePizzaApplied && (
              <div className="loyalty-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-success)' }}>
                <Gift size={20} color="var(--color-success)" />
                <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-success)' }}>
                  <strong>¡Descuento Aplicado!</strong> La pizza #1 se registrará con precio S/. 0.00.
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Configuration Sections for Each Pizza */}
          {selectedPizzas.map((pizza, index) => {
            const pizzaObj = pizzas.find(item => item.id === pizza.pizzaId) || pizzas[0];
            return (
              <div 
                key={index} 
                className="form-group"
                style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--border-radius-md)', 
                  border: '1px solid var(--border-color)', 
                  gap: '1rem' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <PizzaIcon size={18} color="var(--accent-pizza)" />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-pizza)' }}>
                    CONFIGURAR PIZZA N° {index + 1}
                  </span>
                </div>

                <div className="form-group">
                  <label>Sabor de la Pizza {index + 1}</label>
                  <div className="pizza-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {pizzas.map((p) => (
                      <div 
                        key={p.id}
                        className={`pizza-card ${pizza.pizzaId === p.id ? 'selected' : ''}`}
                        style={{ padding: '0.75rem 0.5rem' }}
                        onClick={() => updatePizzaSelection(index, 'pizzaId', p.id)}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>S/. {p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Precio Unitario Personalizado (Opcional, S/.)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder={`Estándar: S/. ${pizzaObj?.price}`} 
                      value={pizza.customPrice}
                      onChange={e => {
                        updatePizzaSelection(index, 'customPrice', e.target.value);
                        if (index === 0) setIsFreePizzaApplied(false);
                      }}
                    />
                  </div>
                </div>

                {ingredientInsumos.length > 0 && (
                  <div className="form-group">
                    <label>Adicionales para Pizza {index + 1}</label>
                    <div className="ingredients-selection">
                      {ingredientInsumos.map((ing) => {
                        const isChecked = pizza.selectedIngredients.includes(ing.id);
                        return (
                          <label key={ing.id} className={`ing-check-label ${isChecked ? 'checked' : ''}`}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleIngredientToggle(index, ing.id)}
                            />
                            <span style={{ fontSize: '0.8rem' }}>{ing.name} (+S/. {parseFloat(ing.cost).toFixed(2)})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Scheduling Section */}
          <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                id="scheduled-check"
                style={{ width: 18, height: 18, accentColor: 'var(--accent-pizza)' }}
                checked={isScheduled}
                onChange={e => setIsScheduled(e.target.checked)}
              />
              <label htmlFor="scheduled-check" style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>¿Programar pedido?</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Te avisaremos para preparar las pizzas.</span>
              </label>
            </div>
            {isScheduled && (
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>Fecha y Hora del Pedido</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={scheduledDateTime}
                  onChange={e => setScheduledDateTime(e.target.value)}
                  required={isScheduled}
                />
              </div>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Método de Pago</label>
              <select 
                className="form-select"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="Yape">💜 Yape</option>
                <option value="Plin">🩵 Plin</option>
                <option value="Transferencia">💙 Transferencia</option>
                <option value="Efectivo">💚 Efectivo</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado del Pago</label>
              <select 
                className="form-select"
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value)}
              >
                <option value="Pagado">🟢 Pagado (Cobrado)</option>
                <option value="Pendiente">🟡 Pendiente (Por cobrar)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <input 
              type="checkbox" 
              id="delivery-check"
              style={{ width: 18, height: 18, accentColor: 'var(--accent-pizza)' }}
              checked={useDelivery}
              onChange={e => setUseDelivery(e.target.checked)}
            />
            <label htmlFor="delivery-check" style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span>¿Es con Delivery / Envío?</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Costo base de delivery: S/. {costs.deliveryCost}</span>
            </label>
            {useDelivery && (
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px', padding: '0.5rem' }}
                value={deliveryCharge}
                onChange={e => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              />
            )}
          </div>

          <div className="form-group">
            <label>Monto total cobrado al cliente (S/.)</label>
            <input 
              type="number" 
              className="form-input" 
              style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-success)' }}
              value={chargedAmount}
              onChange={e => setChargedAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 2 }}>
              <ShoppingBag size={18} /> {editingSale ? 'Guardar Cambios' : `Registrar Venta (${activeQty} ${activeQty === 1 ? 'Pizza' : 'Pizzas'})`}
            </button>
            {editingSale && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setEditingSale(null)}
                style={{ flex: 1, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Real-time Calculation Panel */}
      <div className="glass-panel form-panel checkout-summary-panel" style={{ justifyContent: 'center', position: 'sticky', top: '1.5rem', zIndex: 10 }}>
        <h3 className="logo-text" style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Desglose Financiero ({activeQty} {activeQty === 1 ? 'Pizza' : 'Pizzas'})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Masa base + empaques ({activeQty}x):</span>
            <span>S/. {(singlePizzaBaseCost * activeQty).toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ingredientes Extra Totales:</span>
            <span style={{ color: 'var(--accent-pizza)' }}>
              + S/. {(totalProductionCost - (singlePizzaBaseCost * activeQty)).toFixed(2)}
            </span>
          </div>

          {useDelivery && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Costo Delivery (Envío):</span>
              <span>S/. {parseFloat(costs.deliveryCost || 0).toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Costo Total Operativo:</span>
            <span style={{ color: 'var(--color-danger)' }}>S/. {totalCostWithDelivery.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Monto Cobrado:</span>
            <span style={{ color: 'var(--color-success)' }}>S/. {chargedAmount.toFixed(2)}</span>
          </div>

          <div style={{ 
            background: (chargedAmount - totalCostWithDelivery) >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
            padding: '1.25rem', 
            borderRadius: 'var(--border-radius-md)', 
            border: (chargedAmount - totalCostWithDelivery) >= 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ganancia Neta Estimada
            </span>
            <span style={{ fontSize: '2rem', fontWeight: '800', color: (chargedAmount - totalCostWithDelivery) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              S/. {(chargedAmount - totalCostWithDelivery).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
