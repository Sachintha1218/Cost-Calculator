import { useState, useEffect } from 'react';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import { type Costing, type Fabric, getCostings, getFabrics, deleteCosting } from '../lib/storage';

export default function SavedCostumes() {
  const [costings, setCostings] = useState<Costing[]>([]);
  const [fabrics, setFabrics] = useState<Record<string, Fabric>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const costingsData = await getCostings();
    const fabricsData = await getFabrics();
    
    const fabricMap: Record<string, Fabric> = {};
    fabricsData.forEach(f => {
      fabricMap[f.id] = f;
    });

    setFabrics(fabricMap);
    setCostings(costingsData);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this costume costing?')) {
      await deleteCosting(id);
      loadData();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>Costumes Inventory</h1>
      </div>

      {costings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ImageIcon size={64} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
          <h2>No costumes saved yet</h2>
          <p>Go to the Cost Calculator to save your first costume.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {costings.map((costing) => {
            const fabric = costing.fabricId ? fabrics[costing.fabricId] : null;

            return (
              <div key={costing.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '240px', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {costing.image ? (
                    <img src={costing.image} alt={costing.code} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={48} color="var(--border)" />
                  )}
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>{costing.code}</h2>
                    {fabric ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                         Fabric: <span style={{ fontWeight: '600', color: 'var(--text)' }}>{fabric.name}</span>
                      </p>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Pre-made / No Fabric Linked
                      </p>
                    )}
                    
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Total Cost:</span>
                        <strong>Rs. {costing.totalProductionCost.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)' }}>
                        <span>Net Profit:</span>
                        <strong>Rs. {costing.netProfit.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                        <span>Selling Price:</span>
                        <strong style={{ fontSize: '1.2rem' }}>Rs. {costing.sellingPrice.toFixed(0)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-danger" 
                    style={{ marginTop: '0.5rem', width: '100%' }}
                    onClick={() => handleDelete(costing.id)}
                  >
                    <Trash2 size={16} /> Delete Record
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
