import { M_TO_FT, SQM_TO_SQFT } from '../constants';
import type {
  Area,
  CalculationResult,
  CostScope,
  InstallationMode,
  RoomBreakdown,
  Unit,
} from '../types';

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function normalizeDigits(raw: string): string {
  return raw
    .replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d)
    .replace(/٫/g, '.');
}

export function sanitizeDecimalInput(raw: string): string {
  const normalized = normalizeDigits(raw).replace(/,/g, '.');
  let result = '';
  let hasDot = false;

  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if (ch === '.' && !hasDot) {
      hasDot = true;
      result += result.length === 0 ? '0.' : '.';
    }
  }

  return result;
}

export function parseLocalizedNumber(raw: string): number | null {
  const trimmed = normalizeDigits(raw).trim();
  if (!trimmed) return null;
  const cleaned = trimmed.includes('.') ? trimmed.replace(/,/g, '') : trimmed.replace(/,/g, '.');
  if (!/^\d*(\.\d*)?$/.test(cleaned) || cleaned === '.') return NaN;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatCleanDecimal(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const rounded = Number(value.toFixed(maxDecimals));
  return rounded.toString();
}

export function formatCurrency(value: number, symbol: string): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const formatted = safeValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
}

export function formatNumber(value: number, decimals = 2): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function convertLengthValue(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const parsed = parseLocalizedNumber(raw);
  if (parsed === null || Number.isNaN(parsed) || parsed <= 0) return raw;
  const converted = to === 'ft' ? parsed * M_TO_FT : parsed / M_TO_FT;
  return formatCleanDecimal(converted, 2);
}

export function convertAreaValue(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const parsed = parseLocalizedNumber(raw);
  if (parsed === null || Number.isNaN(parsed) || parsed <= 0) return raw;
  const converted = to === 'ft' ? parsed * SQM_TO_SQFT : parsed / SQM_TO_SQFT;
  return formatCleanDecimal(converted, 2);
}

export function convertAreaPriceValue(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const parsed = parseLocalizedNumber(raw);
  if (parsed === null || Number.isNaN(parsed) || parsed <= 0) return raw;
  const converted = to === 'ft' ? parsed / SQM_TO_SQFT : parsed * SQM_TO_SQFT;
  return formatCleanDecimal(converted, 2);
}

export function convertLinearPriceValue(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const parsed = parseLocalizedNumber(raw);
  if (parsed === null || Number.isNaN(parsed) || parsed <= 0) return raw;
  const converted = to === 'ft' ? parsed / M_TO_FT : parsed * M_TO_FT;
  return formatCleanDecimal(converted, 2);
}

export function createAreaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `area-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CalculateParams {
  areas: Area[];
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
}

export function calculateProjectCost(params: CalculateParams): CalculationResult {
  const roomBreakdowns: RoomBreakdown[] = params.areas.map((area, idx) => {
    const l = parseLocalizedNumber(area.length);
    const w = parseLocalizedNumber(area.width);
    const isValid =
      l !== null &&
      w !== null &&
      !Number.isNaN(l) &&
      !Number.isNaN(w) &&
      l > 0 &&
      w > 0;
    const roomArea = isValid ? l * w : 0;
    const perimeter = isValid && area.operation === 'add' ? 2 * (l + w) : 0;
    return {
      id: area.id,
      name: area.name.trim() || `مساحة ${idx + 1}`,
      length: isValid ? l : 0,
      width: isValid ? w : 0,
      area: roomArea,
      perimeter,
      operation: area.operation === 'subtract' ? 'subtract' : 'add',
      isValid,
    };
  });

  const validRoomsCount = roomBreakdowns.filter((r) => r.isValid).length;
  const grossAddedArea = roomBreakdowns
    .filter((r) => r.isValid && r.operation === 'add')
    .reduce((sum, r) => sum + r.area, 0);
  const deductedArea = roomBreakdowns
    .filter((r) => r.isValid && r.operation === 'subtract')
    .reduce((sum, r) => sum + r.area, 0);
  const netArea = Math.max(0, grossAddedArea - deductedArea);

  const rawPrice = parseLocalizedNumber(params.pricePerUnit);
  const enteredUnitPrice = rawPrice !== null && !Number.isNaN(rawPrice) ? Math.max(0, rawPrice) : 0;

  const rawWaste = parseLocalizedNumber(params.wastePercentage);
  const wasteRate = rawWaste !== null && !Number.isNaN(rawWaste) ? Math.min(100, Math.max(0, rawWaste)) : 0;

  const rawBox = parseLocalizedNumber(params.boxCoverage);
  const boxCoverage = rawBox !== null && !Number.isNaN(rawBox) && rawBox > 0 ? rawBox : 0;

  const rawSkirtPrice = parseLocalizedNumber(params.skirtingPricePerUnit);
  const skirtingUnitPrice =
    rawSkirtPrice !== null && !Number.isNaN(rawSkirtPrice) ? Math.max(0, rawSkirtPrice) : 0;

  const rawSkirtDeduct = parseLocalizedNumber(params.skirtingDeduction);
  const skirtingDeduction =
    rawSkirtDeduct !== null && !Number.isNaN(rawSkirtDeduct) ? Math.max(0, rawSkirtDeduct) : 0;

  const rawInstall = parseLocalizedNumber(params.installationCost);
  const installInput = rawInstall !== null && !Number.isNaN(rawInstall) ? Math.max(0, rawInstall) : 0;

  const rawDelivery = parseLocalizedNumber(params.deliveryCost);
  const deliveryCost = rawDelivery !== null && !Number.isNaN(rawDelivery) ? Math.max(0, rawDelivery) : 0;

  const rawDiscount = parseLocalizedNumber(params.discountPercentage);
  const discountRate =
    rawDiscount !== null && !Number.isNaN(rawDiscount) ? Math.min(100, Math.max(0, rawDiscount)) : 0;

  const rawVat = parseLocalizedNumber(params.vatPercentage);
  const vatRate = rawVat !== null && !Number.isNaN(rawVat) ? Math.min(100, Math.max(0, rawVat)) : 0;

  const unitPriceBeforeVat =
    params.priceIncludesVat && vatRate > 0
      ? enteredUnitPrice / (1 + vatRate / 100)
      : enteredUnitPrice;

  if (netArea <= 0) {
    return {
      grossAddedArea,
      deductedArea,
      netArea: 0,
      wastePercentage: wasteRate,
      wasteArea: 0,
      requiredAreaWithWaste: 0,
      boxCoverage,
      boxesCount: null,
      totalAreaToBuy: 0,
      equivalentOtherUnitArea: 0,
      unitPriceBeforeVat,
      materialCost: 0,
      includeSkirting: params.includeSkirting,
      totalPerimeter: 0,
      skirtingDeduction,
      netSkirtingLength: 0,
      skirtingCost: 0,
      installationCost: 0,
      deliveryCost: 0,
      discountRate,
      discountScope: params.discountScope,
      discountAmount: 0,
      subTotalBeforeVat: 0,
      taxableBase: 0,
      vatRate,
      vatScope: params.vatScope,
      vatAmount: 0,
      grandTotal: 0,
      effectiveCostPerNetUnit: 0,
      roomBreakdowns,
      validRoomsCount,
    };
  }

  const wasteArea = netArea * (wasteRate / 100);
  const requiredAreaWithWaste = netArea + wasteArea;

  let boxesCount: number | null = null;
  let totalAreaToBuy = requiredAreaWithWaste;

  if (boxCoverage > 0) {
    boxesCount = Math.ceil(requiredAreaWithWaste / boxCoverage);
    totalAreaToBuy = boxesCount * boxCoverage;
  }

  const equivalentOtherUnitArea =
    params.unit === 'm' ? totalAreaToBuy * SQM_TO_SQFT : totalAreaToBuy / SQM_TO_SQFT;

  const materialCost = totalAreaToBuy * unitPriceBeforeVat;

  const totalPerimeter = roomBreakdowns
    .filter((r) => r.isValid && r.operation === 'add')
    .reduce((sum, r) => sum + r.perimeter, 0);
  const netSkirtingLength = params.includeSkirting
    ? Math.max(0, totalPerimeter - skirtingDeduction)
    : 0;
  const skirtingCost = params.includeSkirting ? netSkirtingLength * skirtingUnitPrice : 0;

  const installationCost =
    params.installationMode === 'per_unit' ? netArea * installInput : installInput;

  const allMaterialsCost = materialCost + skirtingCost;
  const grossSubTotal = allMaterialsCost + installationCost + deliveryCost;

  const discountBase =
    params.discountScope === 'materials_only' ? allMaterialsCost : grossSubTotal;
  const discountAmount = discountBase * (discountRate / 100);

  const materialsAfterDiscount =
    params.discountScope === 'materials_only'
      ? Math.max(0, allMaterialsCost - discountAmount)
      : Math.max(0, allMaterialsCost * (1 - discountRate / 100));

  const subTotalBeforeVat = Math.max(0, grossSubTotal - discountAmount);

  const taxableBase =
    params.vatScope === 'materials_only' ? materialsAfterDiscount : subTotalBeforeVat;
  const vatAmount = taxableBase * (vatRate / 100);
  const grandTotal = subTotalBeforeVat + vatAmount;
  const effectiveCostPerNetUnit = netArea > 0 ? grandTotal / netArea : 0;

  return {
    grossAddedArea,
    deductedArea,
    netArea,
    wastePercentage: wasteRate,
    wasteArea,
    requiredAreaWithWaste,
    boxCoverage,
    boxesCount,
    totalAreaToBuy,
    equivalentOtherUnitArea,
    unitPriceBeforeVat,
    materialCost,
    includeSkirting: params.includeSkirting,
    totalPerimeter,
    skirtingDeduction,
    netSkirtingLength,
    skirtingCost,
    installationCost,
    deliveryCost,
    discountRate,
    discountScope: params.discountScope,
    discountAmount,
    subTotalBeforeVat,
    taxableBase,
    vatRate,
    vatScope: params.vatScope,
    vatAmount,
    grandTotal,
    effectiveCostPerNetUnit,
    roomBreakdowns,
    validRoomsCount,
  };
}
