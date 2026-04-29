import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle, Image as ImageIcon, Save } from 'lucide-react';
import { type Fabric, getFabrics, addCosting } from '../lib/storage';

interface OtherCost {
  id: string;
  name: string;
  amount: number;
}

export default function ItemCalculator() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [selectedFabricId, setSelectedFabricId] = useState<string>('');
  const [piecesCount, setPiecesCount] = useState<number | ''>('');

  const [fabricSearchQuery, setFabricSearchQuery] = useState('');
  const [isFabricDropdownOpen, setIsFabricDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFabricDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([]);
  const [newCostName, setNewCostName] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  const [pricingStrategy, setPricingStrategy] = useState<'PROFIT_MARGIN' | 'MANUAL_PRICE'>('PROFIT_MARGIN');
  const [manualSellingPrice, setManualSellingPrice] = useState<number | ''>('');

  const [profitType, setProfitType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [profitValue, setProfitValue] = useState<number | ''>('');

  const [bnplTotalPercent, setBnplTotalPercent] = useState<number | ''>(0);
  const [bnplMerchantPercent, setBnplMerchantPercent] = useState<number | ''>(0);
  const [gatewayPercent, setGatewayPercent] = useState<number | ''>(0);
  const [vatPercent, setVatPercent] = useState<number | ''>(0);

  const [deliveryTotal, setDeliveryTotal] = useState<number | ''>(0);
  const [deliveryMerchant, setDeliveryMerchant] = useState<number | ''>(0);

  // Saving state
  const [costumeCode, setCostumeCode] = useState('');
  const [costumeImage, setCostumeImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFabrics().then(setFabrics);
  }, []);

  useEffect(() => {
    if (selectedFabricId && fabrics.length > 0) {
      const selected = fabrics.find(f => f.id === selectedFabricId);
      if (selected && fabricSearchQuery !== selected.name) {
        setFabricSearchQuery(selected.name);
      }
    } else if (!selectedFabricId) {
      setFabricSearchQuery('');
    }
  }, [selectedFabricId, fabrics]);

  const filteredFabrics = fabrics.filter(f => 
    f.name.toLowerCase().includes(fabricSearchQuery.toLowerCase())
  );

  const handleFabricSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFabricSearchQuery(e.target.value);
    setIsFabricDropdownOpen(true);
    if (selectedFabricId) setSelectedFabricId('');
  };

  const handleFabricSelect = (fabric: Fabric) => {
    setSelectedFabricId(fabric.id);
    setFabricSearchQuery(fabric.name);
    setIsFabricDropdownOpen(false);
  };

  const addOtherCost = () => {
    if (!newCostName || !newCostAmount) return;
    setOtherCosts([...otherCosts, {
      id: crypto.randomUUID(),
      name: newCostName,
      amount: parseFloat(newCostAmount)
    }]);
    setNewCostName('');
    setNewCostAmount('');
  };

  const removeOtherCost = (id: string) => {
    setOtherCosts(otherCosts.filter(c => c.id !== id));
  };

  const updateOtherCostName = (id: string, newName: string) => {
    setOtherCosts(otherCosts.map(c => c.id === id ? { ...c, name: newName } : c));
  };
  
  const updateOtherCostAmount = (id: string, newAmount: string) => {
    // We allow empty string during typing to avoid NaN bugs, but treat as 0 for math
    const amount = newAmount === '' ? 0 : parseFloat(newAmount);
    setOtherCosts(otherCosts.map(c => c.id === id ? { ...c, amount } : c));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCostumeImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Calculations
  const selectedFabric = fabrics.find(f => f.id === selectedFabricId);
  const pieces = typeof piecesCount === 'number' && piecesCount > 0 ? piecesCount : 1;
  const baseFabricCost = selectedFabric ? selectedFabric.cost / pieces : 0;
  
  const totalOtherCosts = otherCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totalProductionCost = baseFabricCost + totalOtherCosts;

  const pValue = typeof profitValue === 'number' ? profitValue : 0;
  const netProfit = profitType === 'PERCENT' ? (totalProductionCost * pValue) / 100 : pValue;

  const targetAmountToClear = totalProductionCost + netProfit;

  const dTotal = typeof deliveryTotal === 'number' ? deliveryTotal : 0;
  const dMerchant = typeof deliveryMerchant === 'number' ? deliveryMerchant : 0;
  const dCustomer = Math.max(0, dTotal - dMerchant);

  const bnplTotal = bnplTotalPercent || 0;
  const bnplMerchant = bnplMerchantPercent || 0;
  const bnplCustomer = Math.max(0, bnplTotal - bnplMerchant);
  
  const clientDeductionsPerc = bnplCustomer + (gatewayPercent || 0) + (vatPercent || 0);
  const totalDeductionsPerc = clientDeductionsPerc;
  
  let totalCheckoutPrice = 0;
  let finalSellingPrice = 0;
  let actualNetProfit = 0;
  let merchantAbsorbedBNPLAmount = 0;
  let customerDeductionsAmount = 0;

  if (pricingStrategy === 'PROFIT_MARGIN') {
    if (clientDeductionsPerc < 100) {
      totalCheckoutPrice = (targetAmountToClear + dCustomer) / (1 - (clientDeductionsPerc / 100));
      finalSellingPrice = totalCheckoutPrice - dCustomer;
    } else {
      finalSellingPrice = 0; // Error state
    }

    merchantAbsorbedBNPLAmount = (bnplMerchant / 100) * totalCheckoutPrice;
    actualNetProfit = netProfit - merchantAbsorbedBNPLAmount - dMerchant;
    customerDeductionsAmount = totalCheckoutPrice - (targetAmountToClear + dCustomer);
  } else {
    finalSellingPrice = typeof manualSellingPrice === 'number' ? manualSellingPrice : 0;
    totalCheckoutPrice = finalSellingPrice + dCustomer;
    
    // Reverse math
    const totalFeesPerc = bnplTotal + (gatewayPercent || 0) + (vatPercent || 0);
    const totalPercDeductionsAmount = (totalFeesPerc / 100) * totalCheckoutPrice;
    
    const amountLeftAfterPercAndDelivery = finalSellingPrice - totalPercDeductionsAmount - dMerchant;
    actualNetProfit = amountLeftAfterPercAndDelivery - totalProductionCost;

    // Just for UI breakdown
    merchantAbsorbedBNPLAmount = (bnplMerchant / 100) * totalCheckoutPrice;
    customerDeductionsAmount = (clientDeductionsPerc / 100) * totalCheckoutPrice;
  }

  const handleSaveCostume = async () => {
    if (!costumeCode) {
      alert("Please enter a Costume Code first.");
      return;
    }

    try {
      await addCosting({
        code: costumeCode,
        image: costumeImage,
        fabricId: selectedFabricId || undefined,
        totalProductionCost,
        netProfit: actualNetProfit,
        sellingPrice: finalSellingPrice
      });
      alert(`Costume ${costumeCode} calculation saved successfully!`);
      // Optional: Clear fields or keep them. We can just clear the code/image to allow a new one.
      setCostumeCode('');
      setCostumeImage('');
    } catch (e) {
      console.error(e);
      alert("Failed to save costume costing.");
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: INPUTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>1. Fabric & Yield</h2>
          
          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="form-label">Search & Select Fabric</label>
            <input
              type="text"
              className="form-input"
              placeholder="Type fabric name to search..."
              value={fabricSearchQuery}
              onChange={handleFabricSearchChange}
              onFocus={() => setIsFabricDropdownOpen(true)}
              style={{ background: 'rgba(0,0,0,0.4)' }}
            />
            {isFabricDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0 0 var(--radius) var(--radius)',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 10,
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {filteredFabrics.length > 0 ? (
                  filteredFabrics.map(f => (
                    <div
                      key={f.id}
                      onClick={() => handleFabricSelect(f)}
                      style={{
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: selectedFabricId === f.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = selectedFabricId === f.id ? 'rgba(255,255,255,0.1)' : 'transparent'}
                    >
                      <div style={{ fontWeight: 'bold' }}>{f.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Rs. {f.cost}{f.quantity ? ` (${f.quantity} ${f.unit})` : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No fabrics found matching "{fabricSearchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Total Pieces Yielded</label>
            <input 
              type="number" 
              className="form-input" 
              value={piecesCount} 
              onChange={e => setPiecesCount(e.target.value !== '' ? parseInt(e.target.value) : '')} 
              placeholder="How many items from this fabric?" 
            />
          </div>
          
          {selectedFabric && piecesCount && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} />
              Fabric Cost per Item: <strong>Rs. {baseFabricCost.toFixed(2)}</strong>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>2. Other Production Costs</h2>
          
          {otherCosts.map((cost) => (
            <div key={cost.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                value={cost.name} 
                onChange={(e) => updateOtherCostName(cost.id, e.target.value)}
                style={{ background: 'transparent', border: '1px solid transparent', color: 'inherit', font: 'inherit', outline: 'none', flex: 1, padding: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Cost name"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                <span style={{ fontWeight: 'bold' }}>Rs.</span>
                <input 
                  type="number" 
                  value={cost.amount || ''} 
                  onChange={(e) => updateOtherCostAmount(cost.id, e.target.value)}
                  style={{ background: 'transparent', border: '1px solid transparent', color: 'inherit', font: 'inherit', outline: 'none', width: '80px', fontWeight: 'bold', textAlign: 'right', padding: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="0"
                />
                <button className="btn-outline" style={{ padding: '0.25rem', border: 'none', color: 'var(--danger)', marginLeft: '0.5rem' }} onClick={() => removeOtherCost(cost.id)} title="Remove Cost">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <input type="text" className="form-input" placeholder="e.g. Labor, Tags" value={newCostName} onChange={e => setNewCostName(e.target.value)} />
            <input type="number" className="form-input" placeholder="Amount" value={newCostAmount} onChange={e => setNewCostAmount(e.target.value)} />
            <button className="btn btn-primary" onClick={addOtherCost} style={{ whiteSpace: 'nowrap' }}><Plus size={20} /> Add</button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>3. Pricing Strategy</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              className={`btn ${pricingStrategy === 'PROFIT_MARGIN' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPricingStrategy('PROFIT_MARGIN')}
              style={{ flex: 1 }}
            >
              Target Profit
            </button>
            <button 
              className={`btn ${pricingStrategy === 'MANUAL_PRICE' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPricingStrategy('MANUAL_PRICE')}
              style={{ flex: 1 }}
            >
              Manual Selling Price
            </button>
          </div>

          {pricingStrategy === 'PROFIT_MARGIN' ? (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                  className={`btn ${profitType === 'PERCENT' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setProfitType('PERCENT')}
                  style={{ flex: 1 }}
                >
                  Percentage (%)
                </button>
                <button 
                  className={`btn ${profitType === 'FIXED' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setProfitType('FIXED')}
                  style={{ flex: 1 }}
                >
                  Fixed Amount (LKR)
                </button>
              </div>
              <input 
                type="number" 
                className="form-input" 
                placeholder={profitType === 'PERCENT' ? "e.g. 50 (for 50% margin)" : "e.g. 1500 (Rs. 1500 per item)"} 
                value={profitValue} 
                onChange={e => setProfitValue(e.target.value !== '' ? parseFloat(e.target.value) : '')} 
              />
            </>
          ) : (
            <>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Custom Item Selling Price (LKR)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="e.g. 3500" 
                value={manualSellingPrice} 
                onChange={e => setManualSellingPrice(e.target.value !== '' ? parseFloat(e.target.value) : '')} 
              />
            </>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>4. Deductions & Taxes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label">Total BNPL (Koko/Mintpay) (%)</label>
              <input type="number" className="form-input" value={bnplTotalPercent} onChange={e => setBnplTotalPercent(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 10" />
            </div>
            <div>
              <label className="form-label">BNPL Merchant Absorbs (%)</label>
              <input type="number" className="form-input" value={bnplMerchantPercent} onChange={e => setBnplMerchantPercent(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 4" />
            </div>
            <div>
              <label className="form-label">BNPL Customer Pays (%)</label>
              <div className="form-input" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                {bnplCustomer}%
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Payment Gateway (%)</label>
              <input type="number" className="form-input" value={gatewayPercent} onChange={e => setGatewayPercent(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 2.5" />
            </div>
            <div>
              <label className="form-label">VAT (%)</label>
              <input type="number" className="form-input" value={vatPercent} onChange={e => setVatPercent(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 18" />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>5. Delivery Costs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Total Delivery (LKR)</label>
              <input type="number" className="form-input" value={deliveryTotal} onChange={e => setDeliveryTotal(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 400" />
            </div>
            <div>
              <label className="form-label">Merchant Absorbs (LKR)</label>
              <input type="number" className="form-input" value={deliveryMerchant} onChange={e => setDeliveryMerchant(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 100" />
            </div>
            <div>
              <label className="form-label">Customer Pays (LKR)</label>
              <div className="form-input" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                {dCustomer}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SUMMARY */}
      <div className="glass-panel" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Calculation Summary
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Base Fabric Cost:</span>
            <span>Rs. {baseFabricCost.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Total Other Costs:</span>
            <span>Rs. {totalOtherCosts.toFixed(2)}</span>
          </div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <span>Total Production Cost:</span>
            <span>Rs. {totalProductionCost.toFixed(2)}</span>
          </div>

          {pricingStrategy === 'PROFIT_MARGIN' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-muted)' }}>
              <span>Expected Profit:</span>
              <span>+ Rs. {netProfit.toFixed(2)}</span>
            </div>
          )}
          
          {merchantAbsorbedBNPLAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
              <span>Less: Merchant Absorbed BNPL:</span>
              <span>- Rs. {merchantAbsorbedBNPLAmount.toFixed(2)}</span>
            </div>
          )}
          {dMerchant > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
              <span>Less: Merchant Absorbed Delivery:</span>
              <span>- Rs. {dMerchant.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}>
            <span>Actual Net Profit:</span>
            <span>+ Rs. {actualNetProfit.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', marginTop: '0.5rem' }}>
            <span>Customer Paid Deductions ({clientDeductionsPerc}%):</span>
            <span>+ Rs. {customerDeductionsAmount.toFixed(2)}</span>
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>
          
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Item Selling Price</span>
            <span style={{ display: 'block', fontSize: '3rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {totalDeductionsPerc >= 100 ? 'ERROR' : `Rs. ${finalSellingPrice.toFixed(0)}`}
            </span>
            <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              + Rs. {dCustomer.toFixed(0)} Customer Delivery = Total Checkout: Rs. {totalCheckoutPrice.toFixed(0)}
            </span>
          </div>

          {totalDeductionsPerc >= 100 && (
            <p style={{ color: 'var(--danger)', textAlign: 'center', marginTop: '1rem' }}>
              Deductions cannot be 100% or more!
            </p>
          )}
          
          <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>
          
          {/* Save Costume Block */}
          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Save Final Costing</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Costume Code / SKU</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. AD-DR-001" 
                value={costumeCode}
                onChange={e => setCostumeCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Costume Sample Photo</label>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div 
                style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: '1rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: costumeImage ? 'transparent' : '#ffffff'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {costumeImage ? (
                  <img src={costumeImage} alt="Preview" style={{ maxHeight: '100px', borderRadius: '4px' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={24} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}/>
                    <span style={{ fontSize: '0.8rem' }}>Click to upload costume photo</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleSaveCostume}
              disabled={totalDeductionsPerc >= 100 || !costumeCode}
            >
              <Save size={18} />
              Save to Library
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
