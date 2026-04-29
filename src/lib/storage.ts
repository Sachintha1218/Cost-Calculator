import localforage from 'localforage';

export interface Fabric {
  id: string;
  name: string;
  cost: number; // For example: cost per meter/roll
  quantity?: number;
  unit?: 'Yards' | 'KG' | 'Pieces' | 'Rolls';
  image?: string; // Data URL
  createdAt: number;
}

export interface Costing {
  id: string;
  code: string;
  image?: string;
  fabricId?: string;
  totalProductionCost: number;
  netProfit: number;
  sellingPrice: number;
  createdAt: number;
}

const fabricsStore = localforage.createInstance({
  name: 'cost-calculator',
  storeName: 'fabrics',
});

const costingsStore = localforage.createInstance({
  name: 'cost-calculator',
  storeName: 'costings',
});

export const getFabrics = async (): Promise<Fabric[]> => {
  const fabrics: Fabric[] = [];
  await fabricsStore.iterate((value: Fabric) => {
    fabrics.push(value);
  });
  return fabrics.sort((a, b) => b.createdAt - a.createdAt);
};

export const addFabric = async (fabric: Omit<Fabric, 'id' | 'createdAt'>): Promise<Fabric> => {
  const newFabric: Fabric = {
    ...fabric,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await fabricsStore.setItem(newFabric.id, newFabric);
  return newFabric;
};

export const deleteFabric = async (id: string): Promise<void> => {
  await fabricsStore.removeItem(id);
};

export const updateFabric = async (id: string, updates: Partial<Fabric>): Promise<Fabric | null> => {
  const existing = await fabricsStore.getItem<Fabric>(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await fabricsStore.setItem(id, updated);
  return updated;
};

export const getFabric = async (id: string): Promise<Fabric | null> => {
  return await fabricsStore.getItem<Fabric>(id);
};

export const getCostings = async (): Promise<Costing[]> => {
  const costings: Costing[] = [];
  await costingsStore.iterate((value: Costing) => {
    costings.push(value);
  });
  return costings.sort((a, b) => b.createdAt - a.createdAt);
};

export const addCosting = async (costing: Omit<Costing, 'id' | 'createdAt'>): Promise<Costing> => {
  const newCosting: Costing = {
    ...costing,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await costingsStore.setItem(newCosting.id, newCosting);
  return newCosting;
};

export const deleteCosting = async (id: string): Promise<void> => {
  await costingsStore.removeItem(id);
};
