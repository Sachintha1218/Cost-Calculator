import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { type Fabric, getFabrics, addFabric, updateFabric, deleteFabric } from '../lib/storage';

export default function FabricDirectory() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'Yards' | 'KG' | 'Pieces' | 'Rolls'>('Yards');
  const [image, setImage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    const data = await getFabrics();
    setFabrics(data);
  };

  const openForm = (fabric?: Fabric) => {
    if (fabric) {
      setEditingId(fabric.id);
      setName(fabric.name);
      setCost(fabric.cost.toString());
      setQuantity(fabric.quantity ? fabric.quantity.toString() : '');
      setUnit(fabric.unit || 'Yards');
      setImage(fabric.image || '');
    } else {
      setEditingId(null);
      setName('');
      setCost('');
      setQuantity('');
      setUnit('Yards');
      setImage('');
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost) return;

    const data: Omit<Fabric, 'id' | 'createdAt'> = {
      name,
      cost: parseFloat(cost),
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit,
      image
    };

    if (editingId) {
      await updateFabric(editingId, data);
    } else {
      await addFabric(data);
    }

    closeForm();
    loadFabrics();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fabric?')) {
      await deleteFabric(id);
      loadFabrics();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>Fabric Directory</h1>
        <button className="btn btn-primary" onClick={() => isFormOpen ? closeForm() : openForm()}>
          {isFormOpen ? 'Cancel' : <><Plus size={20} /> Add New Fabric</>}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fabric Name / SKU</label>
              <input 
                type="text" 
                className="form-input" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Cotton Black"
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Cost (LKR)</label>
              <input 
                type="number" 
                className="form-input" 
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 15000"
                min="0"
                step="0.01"
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantity</label>
              <input 
                type="number" 
                className="form-input" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit of Measure</label>
              <select 
                className="form-input" 
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                style={{ appearance: 'none' }}
              >
                <option value="Yards">Yards</option>
                <option value="KG">KG</option>
                <option value="Pieces">Pieces</option>
                <option value="Rolls">Rolls</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Fabric Sample Image</label>
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
                padding: '2rem', 
                textAlign: 'center',
                cursor: 'pointer',
                background: image ? 'transparent' : 'rgba(0,0,0,0.2)'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                  <ImageIcon size={40} style={{ marginBottom: '1rem', color: 'var(--primary)' }}/>
                  Click to upload a sample photo
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {editingId ? 'Update Fabric Details' : 'Save Fabric'}
          </button>
        </form>
      )}

      {fabrics.length === 0 && !isFormOpen ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ImageIcon size={64} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
          <h2>No fabrics added yet</h2>
          <p>Add some fabrics to start calculating costs</p>
        </div>
      ) : (
        <div className="grid-cards">
          {fabrics.map((fabric) => (
            <div key={fabric.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '200px', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fabric.image ? (
                  <img src={fabric.image} alt={fabric.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={48} color="var(--border)" />
                )}
              </div>
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>{fabric.name}</h3>
                  {fabric.quantity && fabric.unit && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {fabric.quantity} {fabric.unit}
                    </p>
                  )}
                  <p style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    Rs. {fabric.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                    onClick={() => openForm(fabric)}
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                    onClick={() => handleDelete(fabric.id)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
