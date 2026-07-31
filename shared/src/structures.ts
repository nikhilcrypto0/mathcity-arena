import type { CrisisId, StructureId } from './types.ts';

export interface StructureDef {
  id: StructureId;
  name: string;
  description: string;
  strategicPurpose: string;
  cost: { coins: number; materials: number; tokens: number };
  maxCount: number;
  /** Flat damage reduction applied against these crises. */
  crisisReduction: Partial<Record<CrisisId, number>>;
  /** Flat damage reduction against enemy raids (walls, shield tower...). */
  raidDefense: number;
  /** Extra resource generation per knowledge-rush answer. */
  economyBonus: number;
  icon: string;
}

export const STRUCTURES: Record<StructureId, StructureDef> = {
  walls: {
    id: 'walls',
    name: 'City Walls',
    description: 'Stone walls around the district core.',
    strategicPurpose: 'Reduce Giant and raid damage.',
    cost: { coins: 40, materials: 30, tokens: 0 },
    maxCount: 3,
    crisisReduction: { earthquake: 100 },
    raidDefense: 60,
    economyBonus: 0,
    icon: 'wall',
  },
  archer_tower: {
    id: 'archer_tower',
    name: 'Archer Tower',
    description: 'Watchtower manned by trained archers.',
    strategicPurpose: 'Fires back at raiding units.',
    cost: { coins: 50, materials: 40, tokens: 0 },
    maxCount: 2,
    crisisReduction: {},
    raidDefense: 80,
    economyBonus: 0,
    icon: 'tower',
  },
  shield_tower: {
    id: 'shield_tower',
    name: 'Shield Tower',
    description: 'Projects a defensive barrier over the core.',
    strategicPurpose: 'Provides defensive barriers during raids.',
    cost: { coins: 60, materials: 50, tokens: 1 },
    maxCount: 1,
    crisisReduction: {},
    raidDefense: 120,
    economyBonus: 0,
    icon: 'shield',
  },
  healing_centre: {
    id: 'healing_centre',
    name: 'Healing Centre',
    description: 'Community clinic by the lake shore.',
    strategicPurpose: 'Restores units between battles.',
    cost: { coins: 50, materials: 30, tokens: 0 },
    maxCount: 1,
    crisisReduction: { population_surge: 200 },
    raidDefense: 0,
    economyBonus: 0,
    icon: 'heart',
  },
  math_academy: {
    id: 'math_academy',
    name: 'Mathematics Academy',
    description: 'A modern glass academy at the city centre.',
    strategicPurpose: 'Increases advanced-question rewards by 25%.',
    cost: { coins: 70, materials: 40, tokens: 1 },
    maxCount: 1,
    crisisReduction: {},
    raidDefense: 0,
    economyBonus: 5,
    icon: 'academy',
  },
  bridge: {
    id: 'bridge',
    name: 'Nile Bridge',
    description: 'A modern bridge across the river.',
    strategicPurpose: 'Keeps supply routes open during transport crises.',
    cost: { coins: 40, materials: 50, tokens: 0 },
    maxCount: 1,
    crisisReduction: { bridge_failure: 400, transport_breakdown: 250 },
    raidDefense: 0,
    economyBonus: 2,
    icon: 'bridge',
  },
  garden: {
    id: 'garden',
    name: 'Public Garden',
    description: 'Green public space with shade trees.',
    strategicPurpose: 'Softens drought and heat losses.',
    cost: { coins: 25, materials: 15, tokens: 0 },
    maxCount: 2,
    crisisReduction: { drought: 150 },
    raidDefense: 0,
    economyBonus: 1,
    icon: 'tree',
  },
  solar_station: {
    id: 'solar_station',
    name: 'Solar-Energy Station',
    description: 'Panels tracking the highland sun.',
    strategicPurpose: 'Improves energy recovery; absorbs power shortages.',
    cost: { coins: 55, materials: 35, tokens: 0 },
    maxCount: 1,
    crisisReduction: { power_shortage: 400 },
    raidDefense: 0,
    economyBonus: 3,
    icon: 'sun',
  },
  water_storage: {
    id: 'water_storage',
    name: 'Water-Storage Facility',
    description: 'Reservoir tanks above the district.',
    strategicPurpose: 'Holds reserves against droughts and shortages.',
    cost: { coins: 45, materials: 30, tokens: 0 },
    maxCount: 1,
    crisisReduction: { water_shortage: 400, drought: 200 },
    raidDefense: 0,
    economyBonus: 0,
    icon: 'droplet',
  },
  drainage: {
    id: 'drainage',
    name: 'Drainage System',
    description: 'Deep storm channels under the streets.',
    strategicPurpose: 'Reduces flood damage by 300.',
    cost: { coins: 50, materials: 40, tokens: 0 },
    maxCount: 1,
    crisisReduction: { flood: 300 },
    raidDefense: 0,
    economyBonus: 0,
    icon: 'waves',
  },
  emergency_shelter: {
    id: 'emergency_shelter',
    name: 'Emergency Shelter',
    description: 'Reinforced community hall with reserves.',
    strategicPurpose: 'Reduces losses from every disaster by 100.',
    cost: { coins: 35, materials: 25, tokens: 0 },
    maxCount: 1,
    crisisReduction: {
      flood: 100, drought: 100, earthquake: 100, power_shortage: 100, bridge_failure: 100,
      material_shortage: 100, population_surge: 100, transport_breakdown: 100, market_price: 100,
      water_shortage: 100,
    },
    raidDefense: 0,
    economyBonus: 0,
    icon: 'home',
  },
  warehouse: {
    id: 'warehouse',
    name: 'Resource Warehouse',
    description: 'Secure stores for materials and grain.',
    strategicPurpose: 'Protects stored resources; softens market shocks.',
    cost: { coins: 40, materials: 35, tokens: 0 },
    maxCount: 1,
    crisisReduction: { material_shortage: 350, market_price: 350 },
    raidDefense: 0,
    economyBonus: 2,
    icon: 'box',
  },
};

export const STRUCTURE_IDS = Object.keys(STRUCTURES) as StructureId[];
