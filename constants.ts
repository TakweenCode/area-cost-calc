import type { CurrencyOption, Product } from './types';

export const M_TO_FT = 3.280839895;
export const SQM_TO_SQFT = 10.763910417;

export const PRODUCTS: Product[] = [
  {
    id: 'ceramic',
    label: 'سيراميك',
    defaultPricePerSqm: 85,
    defaultWastePercent: 10,
    supportsBoxCoverage: true,
    supportsSkirting: true,
  },
  {
    id: 'porcelain',
    label: 'بورسلان',
    defaultPricePerSqm: 125,
    defaultWastePercent: 10,
    supportsBoxCoverage: true,
    supportsSkirting: true,
  },
  {
    id: 'marble',
    label: 'رخام',
    defaultPricePerSqm: 240,
    defaultWastePercent: 12,
    supportsBoxCoverage: false,
    supportsSkirting: true,
  },
  {
    id: 'parquet',
    label: 'باركيه',
    defaultPricePerSqm: 110,
    defaultWastePercent: 8,
    supportsBoxCoverage: true,
    supportsSkirting: true,
  },
  {
    id: 'carpet',
    label: 'فرش (موكيت)',
    defaultPricePerSqm: 50,
    defaultWastePercent: 5,
    supportsBoxCoverage: false,
    supportsSkirting: false,
  },
  {
    id: 'tiles',
    label: 'بلاط',
    defaultPricePerSqm: 65,
    defaultWastePercent: 10,
    supportsBoxCoverage: true,
    supportsSkirting: true,
  },
  {
    id: 'custom',
    label: 'مادة مخصصة',
    defaultPricePerSqm: 100,
    defaultWastePercent: 10,
    supportsBoxCoverage: true,
    supportsSkirting: true,
  },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'SAR', label: 'ريال سعودي', symbol: 'ريال' },
  { code: 'AED', label: 'درهم إماراتي', symbol: 'درهم' },
  { code: 'KWD', label: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'QAR', label: 'ريال قطري', symbol: 'ر.ق' },
  { code: 'JOD', label: 'دينار أردني', symbol: 'د.أ' },
  { code: 'EGP', label: 'جنيه مصري', symbol: 'جنيه' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
];

export const STORAGE_KEY = 'area_cost_calculator_state_v3';
export const SAVED_PROJECTS_KEY = 'area_cost_calculator_saved_projects_v1';
