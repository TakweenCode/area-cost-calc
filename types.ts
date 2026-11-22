export type ProductType =
  | 'ceramic'
  | 'porcelain'
  | 'marble'
  | 'parquet'
  | 'carpet'
  | 'tiles'
  | 'custom';

export type Unit = 'm' | 'ft';

export type InstallationMode = 'fixed' | 'per_unit';

export type CostScope = 'materials_only' | 'all';

export type AreaOperation = 'add' | 'subtract';

export type CurrencyCode = 'SAR' | 'AED' | 'KWD' | 'QAR' | 'EGP' | 'JOD' | 'USD';

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  symbol: string;
}

export interface Product {
  id: ProductType;
  label: string;
  defaultPricePerSqm: number;
  defaultWastePercent: number;
}

export interface Area {
  id: string;
  name: string;
  length: string;
  width: string;
  operation: AreaOperation;
}

export interface RoomBreakdown {
  id: string;
  name: string;
  length: number;
  width: number;
  area: number;
  perimeter: number;
  operation: AreaOperation;
  isValid: boolean;
}

export interface CalculationResult {
  grossAddedArea: number;
  deductedArea: number;
  netArea: number;
  wastePercentage: number;
  wasteArea: number;
  requiredAreaWithWaste: number;
  boxCoverage: number;
  boxesCount: number | null;
  totalAreaToBuy: number;
  equivalentOtherUnitArea: number;
  unitPriceBeforeVat: number;
  materialCost: number;
  includeSkirting: boolean;
  totalPerimeter: number;
  skirtingDeduction: number;
  netSkirtingLength: number;
  skirtingCost: number;
  installationCost: number;
  deliveryCost: number;
  discountRate: number;
  discountScope: CostScope;
  discountAmount: number;
  subTotalBeforeVat: number;
  taxableBase: number;
  vatRate: number;
  vatScope: CostScope;
  vatAmount: number;
  grandTotal: number;
  effectiveCostPerNetUnit: number;
  roomBreakdowns: RoomBreakdown[];
  validRoomsCount: number;
}

export interface CalculatorProjectSnapshot {
  projectName: string;
  areas: Area[];
  selectedProduct: ProductType;
  unit: Unit;
  pricePerUnit: string;
  priceIncludesVat: boolean;
  wastePercentage: string;
  boxCoverage: string;
  includeSkirting: boolean;
  skirtingPricePerUnit: string;
  skirtingDeduction: string;
  installationCost: string;
  installationMode: InstallationMode;
  deliveryCost: string;
  discountPercentage: string;
  discountScope: CostScope;
  vatPercentage: string;
  vatScope: CostScope;
  currency: CurrencyCode;
}

export interface SavedProject {
  id: string;
  name: string;
  savedAt: number;
  grandTotal: number;
  netArea: number;
  unit: Unit;
  currencySymbol: string;
  productLabel: string;
  state: CalculatorProjectSnapshot;
}
