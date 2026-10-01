export * from './status';
export * from './navigation';
export * from './roles';
export * from './access';

export const DEPARTMENTS = [
  'Airframe Systems',
  'Avionics',
  'Propulsion',
  'Ground Support',
  'Armament',
  'Logistics',
  'Quality Assurance',
] as const;

export const CATEGORIES = [
  'Aerospace components',
  'Navigation systems',
  'Electronic warfare',
  'Ground support equipment',
  'Structural assemblies',
  'Consumables and spares',
  'Test and calibration',
] as const;

export const UNITS = ['Nos', 'Set', 'Kit', 'Metre', 'Kg', 'Lot', 'Hour'] as const;

export const APPROVERS = [
  'Cmde R. Menon (Director, Acquisition)',
  'Ms. Kavitha Rao (Director, Finance)',
  'Air Cmde S. Bhatt (Director, Technical)',
  'Shri P. Iyengar (Controller, Audit)',
] as const;

export const TAX_RATES = [0, 5, 12, 18, 28] as const;

export const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
};
