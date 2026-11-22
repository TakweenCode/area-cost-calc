import React, { useState, useMemo, useEffect, useRef } from 'react';
import type {
  Area,
  AreaOperation,
  CalculationResult,
  CalculatorProjectSnapshot,
  CostScope,
  CurrencyCode,
  InstallationMode,
  ProductType,
  SavedProject,
  Unit,
} from '../types';
import { CURRENCIES, PRODUCTS, SAVED_PROJECTS_KEY, STORAGE_KEY } from '../constants';
import {
  calculateProjectCost,
  convertAreaPriceValue,
  convertAreaValue,
  convertLengthValue,
  convertLinearPriceValue,
  createAreaId,
  formatCleanDecimal,
  formatCurrency,
  formatNumber,
  parseLocalizedNumber,
} from '../utils/calculator';
import InputControl from './InputControl';
import SegmentedControl from './SegmentedControl';
import ResultDisplay from './ResultDisplay';
import {
  AlertIcon,
  AreaIcon,
  BookmarkIcon,
  BoxIcon,
  CalculatorIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DuplicateIcon,
  EditIcon,
  InfoIcon,
  PercentIcon,
  PlusIcon,
  PrinterIcon,
  ResetIcon,
  RulerIcon,
  ScissorsIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  WalletIcon,
  WhatsAppIcon,
  WrenchIcon,
} from './Icons';

interface SubmittedCalculation {
  result: CalculationResult;
  projectName: string;
  unit: Unit;
  currencySymbol: string;
  currencyLabel: string;
  productLabel: string;
  installationMode: InstallationMode;
  priceIncludesVat: boolean;
}

const getDefaultState = (): CalculatorProjectSnapshot => ({
  projectName: '',
  areas: [
    { id: createAreaId(), name: 'غرفة المعيشة', length: '5', width: '4', operation: 'add' },
  ],
  selectedProduct: PRODUCTS[0].id,
  unit: 'm',
  pricePerUnit: PRODUCTS[0].defaultPricePerSqm.toString(),
  priceIncludesVat: false,
  wastePercentage: PRODUCTS[0].defaultWastePercent.toString(),
  boxCoverage: '',
  includeSkirting: false,
  skirtingPricePerUnit: '25',
  skirtingDeduction: '0',
  installationCost: '0',
  installationMode: 'fixed',
  deliveryCost: '0',
  discountPercentage: '0',
  discountScope: 'materials_only',
  vatPercentage: '15',
  vatScope: 'materials_only',
  currency: 'SAR',
});

const sanitizeSnapshot = (parsed: Partial<CalculatorProjectSnapshot>): CalculatorProjectSnapshot => {
  const fallback = getDefaultState();
  const validProduct = PRODUCTS.some((p) => p.id === parsed.selectedProduct)
    ? (parsed.selectedProduct as ProductType)
    : fallback.selectedProduct;
  const validUnit: Unit = parsed.unit === 'ft' ? 'ft' : 'm';
  const validInstallMode: InstallationMode =
    parsed.installationMode === 'per_unit' ? 'per_unit' : 'fixed';
  const validCurrency = CURRENCIES.some((c) => c.code === parsed.currency)
    ? (parsed.currency as CurrencyCode)
    : fallback.currency;

  const areas = Array.isArray(parsed.areas)
    ? parsed.areas.map((a, idx) => ({
        id: typeof a.id === 'string' && a.id ? a.id : createAreaId(),
        name: typeof a.name === 'string' ? a.name : `مساحة ${idx + 1}`,
        length: typeof a.length === 'string' ? a.length : '',
        width: typeof a.width === 'string' ? a.width : '',
        operation: (a.operation === 'subtract' ? 'subtract' : 'add') as AreaOperation,
      }))
    : fallback.areas;

  return {
    projectName: typeof parsed.projectName === 'string' ? parsed.projectName : fallback.projectName,
    areas,
    selectedProduct: validProduct,
    unit: validUnit,
    pricePerUnit:
      typeof parsed.pricePerUnit === 'string' ? parsed.pricePerUnit : fallback.pricePerUnit,
    priceIncludesVat: Boolean(parsed.priceIncludesVat),
    wastePercentage:
      typeof parsed.wastePercentage === 'string'
        ? parsed.wastePercentage
        : fallback.wastePercentage,
    boxCoverage: typeof parsed.boxCoverage === 'string' ? parsed.boxCoverage : fallback.boxCoverage,
    includeSkirting: Boolean(parsed.includeSkirting),
    skirtingPricePerUnit:
      typeof parsed.skirtingPricePerUnit === 'string'
        ? parsed.skirtingPricePerUnit
        : fallback.skirtingPricePerUnit,
    skirtingDeduction:
      typeof parsed.skirtingDeduction === 'string'
        ? parsed.skirtingDeduction
        : fallback.skirtingDeduction,
    installationCost:
      typeof parsed.installationCost === 'string'
        ? parsed.installationCost
        : fallback.installationCost,
    installationMode: validInstallMode,
    deliveryCost:
      typeof parsed.deliveryCost === 'string' ? parsed.deliveryCost : fallback.deliveryCost,
    discountPercentage:
      typeof parsed.discountPercentage === 'string'
        ? parsed.discountPercentage
        : fallback.discountPercentage,
    discountScope:
      parsed.discountScope === 'all' || parsed.discountScope === 'materials_only'
        ? parsed.discountScope
        : fallback.discountScope,
    vatPercentage:
      typeof parsed.vatPercentage === 'string' ? parsed.vatPercentage : fallback.vatPercentage,
    vatScope:
      parsed.vatScope === 'all' || parsed.vatScope === 'materials_only'
        ? parsed.vatScope
        : fallback.vatScope,
    currency: validCurrency,
  };
};

const loadInitialState = (): CalculatorProjectSnapshot => {
  const fallback = getDefaultState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CalculatorProjectSnapshot>;
    if (!parsed || !Array.isArray(parsed.areas)) return fallback;
    return sanitizeSnapshot(parsed);
  } catch {
    return fallback;
  }
};

const loadSavedProjects = (): SavedProject[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const Calculator: React.FC = () => {
  const initialRef = useRef<CalculatorProjectSnapshot | null>(null);
  if (!initialRef.current) {
    initialRef.current = loadInitialState();
  }

  const [projectName, setProjectName] = useState<string>(initialRef.current.projectName);
  const [areas, setAreas] = useState<Area[]>(initialRef.current.areas);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>(
    initialRef.current.selectedProduct
  );
  const [unit, setUnit] = useState<Unit>(initialRef.current.unit);
  const [pricePerUnit, setPricePerUnit] = useState<string>(initialRef.current.pricePerUnit);
  const [priceIncludesVat, setPriceIncludesVat] = useState<boolean>(
    initialRef.current.priceIncludesVat
  );
  const [wastePercentage, setWastePercentage] = useState<string>(
    initialRef.current.wastePercentage
  );
  const [boxCoverage, setBoxCoverage] = useState<string>(initialRef.current.boxCoverage);
  const [includeSkirting, setIncludeSkirting] = useState<boolean>(
    initialRef.current.includeSkirting
  );
  const [skirtingPricePerUnit, setSkirtingPricePerUnit] = useState<string>(
    initialRef.current.skirtingPricePerUnit
  );
  const [skirtingDeduction, setSkirtingDeduction] = useState<string>(
    initialRef.current.skirtingDeduction
  );
  const [installationCost, setInstallationCost] = useState<string>(
    initialRef.current.installationCost
  );
  const [installationMode, setInstallationMode] = useState<InstallationMode>(
    initialRef.current.installationMode
  );
  const [deliveryCost, setDeliveryCost] = useState<string>(initialRef.current.deliveryCost);
  const [discountPercentage, setDiscountPercentage] = useState<string>(
    initialRef.current.discountPercentage
  );
  const [discountScope, setDiscountScope] = useState<CostScope>(initialRef.current.discountScope);
  const [vatPercentage, setVatPercentage] = useState<string>(initialRef.current.vatPercentage);
  const [vatScope, setVatScope] = useState<CostScope>(initialRef.current.vatScope);
  const [currency, setCurrency] = useState<CurrencyCode>(initialRef.current.currency);

  const [draftName, setDraftName] = useState<string>('');
  const [draftLength, setDraftLength] = useState<string>('');
  const [draftWidth, setDraftWidth] = useState<string>('');
  const [draftOperation, setDraftOperation] = useState<AreaOperation>('add');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [draftAttempted, setDraftAttempted] = useState<boolean>(false);

  const [submitted, setSubmitted] = useState<SubmittedCalculation | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [calculateError, setCalculateError] = useState<string | null>(null);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => loadSavedProjects());
  const [showSavedProjects, setShowSavedProjects] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);
  const [showOperationHelp, setShowOperationHelp] = useState<boolean>(false);

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const draftNameRef = useRef<HTMLInputElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const errorBannerRef = useRef<HTMLParagraphElement | null>(null);
  const operationHelpRef = useRef<HTMLDivElement | null>(null);

  const currentSnapshot = useMemo<CalculatorProjectSnapshot>(
    () => ({
      projectName,
      areas,
      selectedProduct,
      unit,
      pricePerUnit,
      priceIncludesVat,
      wastePercentage,
      boxCoverage,
      includeSkirting,
      skirtingPricePerUnit,
      skirtingDeduction,
      installationCost,
      installationMode,
      deliveryCost,
      discountPercentage,
      discountScope,
      vatPercentage,
      vatScope,
      currency,
    }),
    [
      projectName,
      areas,
      selectedProduct,
      unit,
      pricePerUnit,
      priceIncludesVat,
      wastePercentage,
      boxCoverage,
      includeSkirting,
      skirtingPricePerUnit,
      skirtingDeduction,
      installationCost,
      installationMode,
      deliveryCost,
      discountPercentage,
      discountScope,
      vatPercentage,
      vatScope,
      currency,
    ]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSnapshot));
    } catch {
      // Ignore storage errors
    }
  }, [currentSnapshot]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(savedProjects));
    } catch {
      // Ignore storage errors
    }
  }, [savedProjects]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showOperationHelp) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        operationHelpRef.current &&
        !operationHelpRef.current.contains(e.target as Node)
      ) {
        setShowOperationHelp(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOperationHelp(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showOperationHelp]);

  const currentCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0],
    [currency]
  );

  const currentProduct = useMemo(
    () => PRODUCTS.find((p) => p.id === selectedProduct) ?? PRODUCTS[0],
    [selectedProduct]
  );

  const markDirty = () => {
    if (submitted) setIsDirty(true);
    if (calculateError) setCalculateError(null);
    if (confirmingReset) setConfirmingReset(false);
  };

  const handleSelectProduct = (productId: ProductType) => {
    setSelectedProduct(productId);
    const product = PRODUCTS.find((p) => p.id === productId);
    if (product && productId !== 'custom') {
      const basePrice = product.defaultPricePerSqm.toString();
      setPricePerUnit(unit === 'ft' ? convertAreaPriceValue(basePrice, 'm', 'ft') : basePrice);
      setWastePercentage(product.defaultWastePercent.toString());
    }
    markDirty();
  };

  const handleUnitChange = (nextUnitValue: string) => {
    const nextUnit = nextUnitValue as Unit;
    if (nextUnit === unit) return;

    setAreas((prev) =>
      prev.map((area) => ({
        ...area,
        length: convertLengthValue(area.length, unit, nextUnit),
        width: convertLengthValue(area.width, unit, nextUnit),
      }))
    );

    setDraftLength((prev) => convertLengthValue(prev, unit, nextUnit));
    setDraftWidth((prev) => convertLengthValue(prev, unit, nextUnit));
    setPricePerUnit((prev) => convertAreaPriceValue(prev, unit, nextUnit));
    setBoxCoverage((prev) => convertAreaValue(prev, unit, nextUnit));
    setSkirtingDeduction((prev) => convertLengthValue(prev, unit, nextUnit));
    setSkirtingPricePerUnit((prev) => convertLinearPriceValue(prev, unit, nextUnit));

    if (installationMode === 'per_unit') {
      setInstallationCost((prev) => convertAreaPriceValue(prev, unit, nextUnit));
    }

    setUnit(nextUnit);
    markDirty();
  };

  const handleInstallationModeChange = (nextModeValue: string) => {
    const nextMode = nextModeValue as InstallationMode;
    if (nextMode === installationMode) return;
    setInstallationMode(nextMode);
    markDirty();
  };

  const draftLengthNum = parseLocalizedNumber(draftLength);
  const draftWidthNum = parseLocalizedNumber(draftWidth);
  const isDraftLengthValid =
    draftLengthNum !== null && !Number.isNaN(draftLengthNum) && draftLengthNum > 0;
  const isDraftWidthValid =
    draftWidthNum !== null && !Number.isNaN(draftWidthNum) && draftWidthNum > 0;
  const draftPreviewArea =
    isDraftLengthValid && isDraftWidthValid ? draftLengthNum * draftWidthNum : 0;

  const clearDraft = () => {
    setDraftName('');
    setDraftLength('');
    setDraftWidth('');
    setDraftOperation('add');
    setEditingAreaId(null);
    setDraftAttempted(false);
  };

  const handleSaveDraftArea = () => {
    if (!isDraftLengthValid || !isDraftWidthValid) {
      setDraftAttempted(true);
      return;
    }

    if (editingAreaId) {
      setAreas((prev) =>
        prev.map((area, idx) =>
          area.id === editingAreaId
            ? {
                ...area,
                name: draftName.trim() || `مساحة ${idx + 1}`,
                length: draftLength,
                width: draftWidth,
                operation: draftOperation,
              }
            : area
        )
      );
    } else {
      setAreas((prev) => [
        ...prev,
        {
          id: createAreaId(),
          name:
            draftName.trim() ||
            (draftOperation === 'subtract'
              ? `مستثناة ${prev.length + 1}`
              : `مساحة ${prev.length + 1}`),
          length: draftLength,
          width: draftWidth,
          operation: draftOperation,
        },
      ]);
    }

    clearDraft();
    markDirty();
    draftNameRef.current?.focus();
  };

  const handleStartEditArea = (area: Area) => {
    setEditingAreaId(area.id);
    setDraftName(area.name);
    setDraftLength(area.length);
    setDraftWidth(area.width);
    setDraftOperation(area.operation);
    setDraftAttempted(false);
    draftNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    draftNameRef.current?.focus({ preventScroll: true });
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveDraftArea();
    }
  };

  const duplicateArea = (areaToCopy: Area) => {
    setAreas((prev) => {
      const idx = prev.findIndex((a) => a.id === areaToCopy.id);
      const copy: Area = {
        id: createAreaId(),
        name: areaToCopy.name ? `${areaToCopy.name} (نسخة)` : `مساحة ${prev.length + 1}`,
        length: areaToCopy.length,
        width: areaToCopy.width,
        operation: areaToCopy.operation,
      };
      if (idx === -1) return [...prev, copy];
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    markDirty();
  };

  const removeArea = (id: string) => {
    setAreas((prev) => prev.filter((area) => area.id !== id));
    if (editingAreaId === id) {
      clearDraft();
    }
    markDirty();
  };

  const applySnapshot = (snap: CalculatorProjectSnapshot) => {
    setProjectName(snap.projectName);
    setAreas(snap.areas);
    setSelectedProduct(snap.selectedProduct);
    setUnit(snap.unit);
    setPricePerUnit(snap.pricePerUnit);
    setPriceIncludesVat(snap.priceIncludesVat);
    setWastePercentage(snap.wastePercentage);
    setBoxCoverage(snap.boxCoverage);
    setIncludeSkirting(snap.includeSkirting);
    setSkirtingPricePerUnit(snap.skirtingPricePerUnit);
    setSkirtingDeduction(snap.skirtingDeduction);
    setInstallationCost(snap.installationCost);
    setInstallationMode(snap.installationMode);
    setDeliveryCost(snap.deliveryCost);
    setDiscountPercentage(snap.discountPercentage);
    setDiscountScope(snap.discountScope);
    setVatPercentage(snap.vatPercentage);
    setVatScope(snap.vatScope);
    setCurrency(snap.currency);
    clearDraft();
  };

  const handleReset = () => {
    applySnapshot(getDefaultState());
    setSubmitted(null);
    setIsDirty(false);
    setCalculateError(null);
    setConfirmingReset(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const liveAreaStats = useMemo(() => {
    let added = 0;
    let subtracted = 0;
    let perimeter = 0;

    for (const area of areas) {
      const l = parseLocalizedNumber(area.length);
      const w = parseLocalizedNumber(area.width);
      if (l !== null && w !== null && !Number.isNaN(l) && !Number.isNaN(w) && l > 0 && w > 0) {
        const a = l * w;
        if (area.operation === 'subtract') {
          subtracted += a;
        } else {
          added += a;
          perimeter += 2 * (l + w);
        }
      }
    }

    return {
      added,
      subtracted,
      net: Math.max(0, added - subtracted),
      perimeter,
    };
  }, [areas]);

  const vatNum = parseLocalizedNumber(vatPercentage);
  const vatError =
    vatNum !== null && !Number.isNaN(vatNum) && vatNum > 100
      ? 'لا يمكن أن تتجاوز الضريبة 100%'
      : undefined;

  const wasteNum = parseLocalizedNumber(wastePercentage);
  const wasteError =
    wasteNum !== null && !Number.isNaN(wasteNum) && wasteNum > 100
      ? 'لا يمكن أن تتجاوز نسبة الهدر 100%'
      : undefined;

  const discountNum = parseLocalizedNumber(discountPercentage);
  const discountError =
    discountNum !== null && !Number.isNaN(discountNum) && discountNum > 100
      ? 'لا يمكن أن يتجاوز الخصم 100%'
      : undefined;

  const runCompute = (snap: CalculatorProjectSnapshot) => {
    const prod = PRODUCTS.find((p) => p.id === snap.selectedProduct) ?? PRODUCTS[0];
    return calculateProjectCost({
      areas: snap.areas,
      unit: snap.unit,
      pricePerUnit: snap.pricePerUnit,
      priceIncludesVat: snap.priceIncludesVat,
      wastePercentage: snap.wastePercentage,
      boxCoverage: prod.supportsBoxCoverage ? snap.boxCoverage : '',
      includeSkirting: prod.supportsSkirting ? snap.includeSkirting : false,
      skirtingPricePerUnit: snap.skirtingPricePerUnit,
      skirtingDeduction: snap.skirtingDeduction,
      installationCost: snap.installationCost,
      installationMode: snap.installationMode,
      deliveryCost: snap.deliveryCost,
      discountPercentage: snap.discountPercentage,
      discountScope: snap.discountScope,
      vatPercentage: snap.vatPercentage,
      vatScope: snap.vatScope,
    });
  };

  const scrollToErrorOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const handleCalculate = () => {
    if (areas.length === 0 || liveAreaStats.added <= 0) {
      if (isDraftLengthValid && isDraftWidthValid) {
        setCalculateError(
          'اضغط على «إضافة المساحة» أولاً لإدراج الأبعاد المدخلة في القائمة ثم احسب التكلفة.'
        );
      } else {
        setCalculateError('يرجى إضافة مساحة واحدة على الأقل قبل حساب التكلفة.');
      }
      scrollToErrorOnMobile();
      return;
    }

    if (liveAreaStats.net <= 0) {
      setCalculateError('المساحة المستثناة أكبر من أو تساوي المساحة المضافة — يرجى مراجعة الأبعاد.');
      scrollToErrorOnMobile();
      return;
    }

    if (vatError || wasteError || discountError) {
      setCalculateError('يرجى تصحيح القيم غير الصالحة في الحقول قبل الحساب.');
      scrollToErrorOnMobile();
      return;
    }

    const computed = runCompute(currentSnapshot);

    setSubmitted({
      result: computed,
      projectName: projectName.trim(),
      unit,
      currencySymbol: currentCurrency.symbol,
      currencyLabel: currentCurrency.label,
      productLabel: currentProduct.label,
      installationMode,
      priceIncludesVat,
    });
    setIsDirty(false);
    setCalculateError(null);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleFillSampleAndCalculate = () => {
    const sampleAreas: Area[] = [
      {
        id: createAreaId(),
        name: 'غرفة المعيشة',
        length: unit === 'm' ? '5' : '16.4',
        width: unit === 'm' ? '4' : '13.12',
        operation: 'add',
      },
    ];
    setAreas(sampleAreas);
    const snap = { ...currentSnapshot, areas: sampleAreas };
    const computed = runCompute(snap);
    setSubmitted({
      result: computed,
      projectName: projectName.trim(),
      unit,
      currencySymbol: currentCurrency.symbol,
      currencyLabel: currentCurrency.label,
      productLabel: currentProduct.label,
      installationMode,
      priceIncludesVat,
    });
    setIsDirty(false);
    setCalculateError(null);
  };

  const handleSaveProject = () => {
    if (liveAreaStats.net <= 0) {
      setCalculateError('أضف مساحة صالحة على الأقل لحفظ عرض السعر.');
      scrollToErrorOnMobile();
      return;
    }
    const snap = currentSnapshot;
    const computed = runCompute(snap);
    const displayTitle =
      projectName.trim() ||
      `${currentProduct.label} (${formatNumber(computed.netArea)} ${unit === 'm' ? 'م²' : 'قدم²'})`;

    const newEntry: SavedProject = {
      id: createAreaId(),
      name: displayTitle,
      savedAt: Date.now(),
      grandTotal: computed.grandTotal,
      netArea: computed.netArea,
      unit,
      currencySymbol: currentCurrency.symbol,
      productLabel: currentProduct.label,
      state: snap,
    };

    setSavedProjects((prev) => [newEntry, ...prev].slice(0, 12));
    setShowSavedProjects(true);
    setSavedNotice(true);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleLoadProject = (saved: SavedProject) => {
    const cleanSnap = sanitizeSnapshot(saved.state);
    applySnapshot(cleanSnap);
    const computed = runCompute(cleanSnap);
    const loadedCurrency = CURRENCIES.find((c) => c.code === cleanSnap.currency) ?? CURRENCIES[0];
    const loadedProduct = PRODUCTS.find((p) => p.id === cleanSnap.selectedProduct) ?? PRODUCTS[0];

    setSubmitted({
      result: computed,
      projectName: cleanSnap.projectName.trim() || saved.name,
      unit: cleanSnap.unit,
      currencySymbol: loadedCurrency.symbol,
      currencyLabel: loadedCurrency.label,
      productLabel: loadedProduct.label,
      installationMode: cleanSnap.installationMode,
      priceIncludesVat: cleanSnap.priceIncludesVat,
    });
    setIsDirty(false);
    setCalculateError(null);
  };

  const handleDeleteSavedProject = (id: string) => {
    setSavedProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const areaUnit = unit === 'm' ? 'م²' : 'قدم²';
  const dimensionUnit = unit === 'm' ? 'متر' : 'قدم';
  const priceUnitLabel = unit === 'm' ? 'للمتر المربع' : 'للقدم المربع';
  const linearUnitLabel = unit === 'm' ? 'للمتر الطولي' : 'للقدم الطولي';

  const summaryUnit = submitted?.unit ?? unit;
  const summaryAreaUnit = summaryUnit === 'm' ? 'م²' : 'قدم²';
  const summaryOtherAreaUnit = summaryUnit === 'm' ? 'قدم²' : 'م²';
  const summaryDimensionUnit = summaryUnit === 'm' ? 'متر' : 'قدم';
  const summaryCurrencySymbol = submitted?.currencySymbol ?? currentCurrency.symbol;
  const summaryCurrencyLabel = submitted?.currencyLabel ?? currentCurrency.label;

  const costBreakdownShares = useMemo(() => {
    if (!submitted) {
      return { materialPct: 0, installPct: 0, deliveryPct: 0, vatPct: 0 };
    }
    const r = submitted.result;
    const materialsTotal = r.materialCost + r.skirtingCost;
    const totalComponents = materialsTotal + r.installationCost + r.deliveryCost + r.vatAmount;
    if (totalComponents <= 0) {
      return { materialPct: 0, installPct: 0, deliveryPct: 0, vatPct: 0 };
    }
    const materialPct = (materialsTotal / totalComponents) * 100;
    const installPct = (r.installationCost / totalComponents) * 100;
    const deliveryPct = (r.deliveryCost / totalComponents) * 100;
    const vatPct = Math.max(0, 100 - materialPct - installPct - deliveryPct);
    return { materialPct, installPct, deliveryPct, vatPct };
  }, [submitted]);

  const buildQuoteText = (): string => {
    if (!submitted || submitted.result.netArea <= 0) return '';
    const r = submitted.result;
    const scopeLabel = (scope: CostScope) =>
      scope === 'materials_only' ? 'على المواد فقط' : 'على كامل الفاتورة';

    const title = submitted.projectName
      ? `تقدير تكلفة: ${submitted.projectName} (${submitted.productLabel})`
      : `تقدير تكلفة تغطية المساحات — ${submitted.productLabel}`;

    const lines = [
      title,
      `────────────────────────`,
      ...r.roomBreakdowns
        .filter((room) => room.isValid)
        .map((room) => {
          const prefix = room.operation === 'subtract' ? '− (مستثناة) ' : '+ ';
          return `• ${prefix}${room.name}: ${formatCleanDecimal(room.length)} × ${formatCleanDecimal(room.width)} ${summaryDimensionUnit} = ${formatNumber(room.area)} ${summaryAreaUnit}`;
        }),
      `────────────────────────`,
      `المساحة الصافية: ${formatNumber(r.netArea)} ${summaryAreaUnit}`,
      `نسبة الهدر (${formatCleanDecimal(r.wastePercentage)}%): ${formatNumber(r.wasteArea)} ${summaryAreaUnit}`,
      ...(r.boxesCount !== null
        ? [
            `عدد الكراتين المطلوبة: ${r.boxesCount} كرتون (تغطي ${formatNumber(r.totalAreaToBuy)} ${summaryAreaUnit})`,
          ]
        : [`المساحة المطلوب شراؤها: ${formatNumber(r.totalAreaToBuy)} ${summaryAreaUnit}`]),
      `تكلفة المواد: ${formatCurrency(r.materialCost, summaryCurrencySymbol)}`,
      ...(r.includeSkirting
        ? [
            `الوزرة / النعلات (${formatNumber(r.netSkirtingLength)} ${summaryDimensionUnit}): ${formatCurrency(r.skirtingCost, summaryCurrencySymbol)}`,
          ]
        : []),
      `تكلفة التركيب: ${formatCurrency(r.installationCost, summaryCurrencySymbol)}`,
      `تكلفة التوصيل: ${formatCurrency(r.deliveryCost, summaryCurrencySymbol)}`,
      ...(r.discountAmount > 0
        ? [
            `الخصم (${formatCleanDecimal(r.discountRate)}% · ${scopeLabel(r.discountScope)}): -${formatCurrency(r.discountAmount, summaryCurrencySymbol)}`,
          ]
        : []),
      `ضريبة القيمة المضافة (${formatCleanDecimal(r.vatRate)}% · ${scopeLabel(r.vatScope)}): ${formatCurrency(r.vatAmount, summaryCurrencySymbol)}`,
      `────────────────────────`,
      `التكلفة الإجمالية: ${formatCurrency(r.grandTotal, summaryCurrencySymbol)}`,
    ];

    return lines.join('\n');
  };

  const handleCopyQuote = async () => {
    const text = buildQuoteText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2500);
  };

  const whatsAppUrl = useMemo(() => {
    const text = buildQuoteText();
    return text ? `https://wa.me/?text=${encodeURIComponent(text)}` : '#';
  }, [submitted, summaryCurrencySymbol, summaryAreaUnit, summaryDimensionUnit]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Input Workspace Panel */}
      <section
        aria-label="إدخال الأبعاد والمواد"
        className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-7 print-full"
      >
        {/* Workspace Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 pb-5 mb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              مواصفات المشروع والمساحات
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أكمل إدخال المساحات والتكاليف ثم اضغط على زر «احسب التكلفة»
            </p>
          </div>

          <div className="w-full sm:w-auto no-print">
            <label htmlFor="currency-select" className="sr-only">
              العملة
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as CurrencyCode);
                markDirty();
              }}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-base sm:text-sm font-medium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 dark:focus:border-teal-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Name + Saved Projects Toggle */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                اسم المشروع / العميل (اختياري)
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  markDirty();
                }}
                placeholder="مثال: شقة الدور الثاني، فيلا الياسمين..."
                className="block w-full min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-2 px-3 text-base sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:border-teal-700 dark:focus:border-teal-400 focus:ring-teal-700/20 dark:focus:ring-teal-400/20"
              />
            </div>

            {savedProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSavedProjects((v) => !v)}
                aria-expanded={showSavedProjects}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 no-print focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                العروض المحفوظة ({savedProjects.length})
              </button>
            )}
          </div>

          {showSavedProjects && savedProjects.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3.5 space-y-2 no-print">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>العروض المحفوظة للمقارنة</span>
                <button
                  type="button"
                  onClick={() => setShowSavedProjects(false)}
                  className="min-h-[32px] px-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  إخفاء
                </button>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700/80 max-h-60 overflow-y-auto">
                {savedProjects.map((saved) => (
                  <li
                    key={saved.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
                        {saved.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        {saved.productLabel} · {formatNumber(saved.netArea)}{' '}
                        {saved.unit === 'm' ? 'م²' : 'قدم²'} ·{' '}
                        <strong className="text-teal-700 dark:text-teal-400">
                          {formatCurrency(saved.grandTotal, saved.currencySymbol)}
                        </strong>
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadProject(saved)}
                        className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                      >
                        عرض
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedProject(saved.id)}
                        className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 sm:bg-transparent border border-slate-200 dark:border-slate-700 sm:border-transparent hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        aria-label={`حذف العرض ${saved.name}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Material Type (Dropdown) & Measurement Unit */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="product-select"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  نوع مادة التغطية
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  هدر مقترح: {currentProduct.defaultWastePercent}%
                </span>
              </div>
              <select
                id="product-select"
                value={selectedProduct}
                onChange={(e) => handleSelectProduct(e.target.value as ProductType)}
                className="w-full min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-base sm:text-sm font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 dark:focus:border-teal-400"
              >
                {PRODUCTS.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  وحدة القياس
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">تحويل تلقائي</span>
              </div>
              <SegmentedControl
                ariaLabel="وحدة القياس"
                options={[
                  { value: 'm', label: 'متر (م²)' },
                  { value: 'ft', label: 'قدم (قدم²)' },
                ]}
                selectedValue={unit}
                onValueChange={handleUnitChange}
              />
            </div>
          </div>

          {/* Fixed Add / Edit Area Box + Added Spaces List */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-5">
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 sm:p-4 space-y-3.5 no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {editingAreaId ? 'تعديل المساحة المحددة' : 'إضافة مساحة جديدة'}
                </h3>
                {draftPreviewArea > 0 && (
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                    {draftOperation === 'subtract' ? '−' : '+'} {formatNumber(draftPreviewArea)}{' '}
                    {areaUnit}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label
                    htmlFor="draft-room-name"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    اسم الغرفة / المساحة (اختياري)
                  </label>
                  <input
                    ref={draftNameRef}
                    id="draft-room-name"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    placeholder={
                      draftOperation === 'subtract'
                        ? 'مثال: جزيرة المطبخ، عمود...'
                        : 'مثال: غرفة المعيشة، الصالة...'
                    }
                    className="block w-full min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-2.5 px-3 text-base sm:text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-teal-700 dark:focus:border-teal-400 focus:ring-teal-700/20 dark:focus:ring-teal-400/20"
                  />
                </div>

                <div ref={operationHelpRef} className="relative">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        نوع الإدخال
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowOperationHelp((v) => !v)}
                        aria-expanded={showOperationHelp}
                        aria-controls="operation-help-popover"
                        aria-label="توضيح المقصود بنوع الإدخال"
                        title="ما المقصود بنوع الإدخال؟"
                        className={`inline-flex items-center justify-center w-8 h-8 -my-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          showOperationHelp
                            ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 hover:text-teal-700 dark:hover:text-teal-300'
                        }`}
                      >
                        <InfoIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showOperationHelp && (
                    <div
                      id="operation-help-popover"
                      role="dialog"
                      aria-label="توضيح نوع الإدخال"
                      className="absolute z-30 top-full inset-x-0 sm:inset-x-auto sm:start-0 sm:w-80 mt-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          توضيح نوع الإدخال
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowOperationHelp(false)}
                          aria-label="إغلاق التوضيح"
                          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <p>
                          <strong className="text-teal-700 dark:text-teal-400">إضافة (+):</strong>{' '}
                          للمساحات الأساسية المطلوب تغطيتها مثل الغرف والصالات والممرات.
                        </p>
                        <p>
                          <strong className="text-amber-700 dark:text-amber-400">
                            طرح مستثنى (−):
                          </strong>{' '}
                          لخصم الأجزاء غير المغطاة داخل الغرفة مثل جزيرة المطبخ أو الأعمدة أو الخزائن
                          الثابتة.
                        </p>
                        <p className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          مثال: مطبخ 20 م² (إضافة) − جزيرة 2 م² (طرح) = 18 م² صافية.
                        </p>
                      </div>
                    </div>
                  )}

                  <SegmentedControl
                    ariaLabel="نوع إدخال المساحة"
                    options={[
                      { value: 'add', label: 'إضافة (+)' },
                      { value: 'subtract', label: 'طرح مستثنى (−)' },
                    ]}
                    selectedValue={draftOperation}
                    onValueChange={(val) => setDraftOperation(val as AreaOperation)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputControl
                  id="draft-length"
                  label="الطول"
                  icon={<RulerIcon className="w-4 h-4" />}
                  value={draftLength}
                  onChange={(val) => {
                    setDraftLength(val);
                    if (draftAttempted) setDraftAttempted(false);
                  }}
                  onKeyDown={handleDraftKeyDown}
                  unit={dimensionUnit}
                  error={
                    draftAttempted && !isDraftLengthValid ? 'أدخل طولاً أكبر من صفر' : undefined
                  }
                />
                <InputControl
                  id="draft-width"
                  label="العرض"
                  icon={<RulerIcon className="w-4 h-4 rotate-90" />}
                  value={draftWidth}
                  onChange={(val) => {
                    setDraftWidth(val);
                    if (draftAttempted) setDraftAttempted(false);
                  }}
                  onKeyDown={handleDraftKeyDown}
                  unit={dimensionUnit}
                  error={
                    draftAttempted && !isDraftWidthValid ? 'أدخل عرضاً أكبر من صفر' : undefined
                  }
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                {editingAreaId && (
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    إلغاء التعديل
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraftArea}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {editingAreaId ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <PlusIcon className="w-4 h-4" />
                  )}
                  <span>{editingAreaId ? 'حفظ التعديل' : 'إضافة المساحة'}</span>
                </button>
              </div>
            </div>

            {/* Added Areas List Below */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  قائمة المساحات المضافة ({areas.length})
                </h3>
                {liveAreaStats.added > 0 && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {liveAreaStats.subtracted > 0
                      ? `(${formatNumber(liveAreaStats.added)} − ${formatNumber(
                          liveAreaStats.subtracted
                        )}) = الصافي ${formatNumber(liveAreaStats.net)} ${areaUnit}`
                      : `الإجمالي الصافي: ${formatNumber(liveAreaStats.net)} ${areaUnit}`}
                  </span>
                )}
              </div>

              {areas.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                  لم تتم إضافة أي مساحات بعد. أدخل اسم الغرفة وأبعادها أعلاه ثم اضغط «إضافة
                  المساحة».
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                  {areas.map((area, index) => {
                    const l = parseLocalizedNumber(area.length) ?? 0;
                    const w = parseLocalizedNumber(area.width) ?? 0;
                    const roomArea = l > 0 && w > 0 ? l * w : 0;
                    const displayName = area.name.trim() || `مساحة ${index + 1}`;
                    const isSubtracted = area.operation === 'subtract';
                    const isEditing = editingAreaId === area.id;

                    return (
                      <li
                        key={area.id}
                        className={`py-3.5 px-1.5 space-y-2.5 transition-colors ${
                          isEditing ? 'bg-teal-50/60 dark:bg-teal-950/30 rounded-lg' : ''
                        }`}
                      >
                        {/* Row 1: Full Room Name + Area */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 tabular-nums shrink-0 pt-0.5">
                              {String(index + 1).padStart(2, '0')}.
                            </span>
                            <p className="text-base sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                              {displayName}
                            </p>
                          </div>

                          <span
                            className={`text-base sm:text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ${
                              isSubtracted
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-teal-700 dark:text-teal-400'
                            }`}
                          >
                            {isSubtracted ? '−' : '+'} {formatNumber(roomArea)} {areaUnit}
                          </span>
                        </div>

                        {/* Row 2: Dimensions / Status + Touch-Friendly Actions */}
                        <div className="flex items-center justify-between gap-2 ps-6">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                            <span className="tabular-nums">
                              {formatCleanDecimal(l)} × {formatCleanDecimal(w)} {dimensionUnit}
                            </span>
                            {isSubtracted && (
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                · مستثناة
                              </span>
                            )}
                            {isEditing && (
                              <span className="font-semibold text-teal-700 dark:text-teal-400">
                                · قيد التعديل
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 no-print">
                            <button
                              type="button"
                              onClick={() => handleStartEditArea(area)}
                              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-800/70 sm:bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                              title="تعديل هذه المساحة"
                              aria-label={`تعديل ${displayName}`}
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => duplicateArea(area)}
                              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-800/70 sm:bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                              title="تكرار هذه المساحة"
                              aria-label={`تكرار ${displayName}`}
                            >
                              <DuplicateIcon className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeArea(area.id)}
                              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg bg-red-50/80 dark:bg-red-950/40 sm:bg-transparent text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              title="حذف هذه المساحة"
                              aria-label={`حذف ${displayName}`}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Pricing, Carton Coverage, Skirting, Installation, Delivery & Tax Controls */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              التسعير والتغطية والخدمات والضرائب
            </h3>

            {/* Material Price + Tax-Inclusive Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <InputControl
                id="price"
                label={`سعر المادة (${priceUnitLabel})`}
                icon={<TagIcon className="w-4 h-4" />}
                value={pricePerUnit}
                onChange={(val) => {
                  setPricePerUnit(val);
                  markDirty();
                }}
                unit={currentCurrency.symbol}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  حالة ضريبة سعر المادة
                </label>
                <SegmentedControl
                  ariaLabel="حالة ضريبة سعر المادة"
                  options={[
                    { value: 'exclude', label: 'قبل الضريبة' },
                    { value: 'include', label: 'شامل الضريبة' },
                  ]}
                  selectedValue={priceIncludesVat ? 'include' : 'exclude'}
                  onValueChange={(val) => {
                    setPriceIncludesVat(val === 'include');
                    markDirty();
                  }}
                />
              </div>
            </div>

            {/* Waste % + Conditional Carton/Box Coverage */}
            <div
              className={`grid grid-cols-1 ${
                currentProduct.supportsBoxCoverage ? 'sm:grid-cols-2' : ''
              } gap-4`}
            >
              <InputControl
                id="waste"
                label="نسبة الهدر والقص"
                icon={<ScissorsIcon className="w-4 h-4" />}
                value={wastePercentage}
                onChange={(val) => {
                  setWastePercentage(val);
                  markDirty();
                }}
                unit="%"
                error={wasteError}
                hint="تغطي فواصل القص والكسر (عادة 5% – 12%)"
              />

              {currentProduct.supportsBoxCoverage && (
                <InputControl
                  id="box-coverage"
                  label="تغطية الكرتون الواحد (اختياري)"
                  icon={<BoxIcon className="w-4 h-4" />}
                  value={boxCoverage}
                  onChange={(val) => {
                    setBoxCoverage(val);
                    markDirty();
                  }}
                  unit={areaUnit}
                  placeholder="مثال: 1.44"
                  hint="يُقرّب الكمية لأقرب كرتون كامل عند إدخاله"
                />
              )}
            </div>

            {/* Optional Skirting / Baseboard Calculation (hidden for carpet/moquette) */}
            {currentProduct.supportsSkirting && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="include-skirting"
                    className="inline-flex items-center gap-2.5 min-h-[44px] sm:min-h-0 cursor-pointer select-none"
                  >
                    <input
                      id="include-skirting"
                      type="checkbox"
                      checked={includeSkirting}
                      onChange={(e) => {
                        setIncludeSkirting(e.target.checked);
                        markDirty();
                      }}
                      className="w-5 h-5 sm:w-4 sm:h-4 rounded border-slate-300 dark:border-slate-600 text-teal-700 focus:ring-teal-600 shrink-0"
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      إضافة حساب الوزرة / النعلات (محيط الغرف)
                    </span>
                  </label>

                  {liveAreaStats.perimeter > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      محيط الغرف: {formatNumber(liveAreaStats.perimeter)} {dimensionUnit}
                    </span>
                  )}
                </div>

                {includeSkirting && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <InputControl
                      id="skirting-price"
                      label={`سعر الوزرة (${linearUnitLabel})`}
                      icon={<TagIcon className="w-4 h-4" />}
                      value={skirtingPricePerUnit}
                      onChange={(val) => {
                        setSkirtingPricePerUnit(val);
                        markDirty();
                      }}
                      unit={currentCurrency.symbol}
                    />

                    <InputControl
                      id="skirting-deduction"
                      label="خصم فتحات الأبواب (اختياري)"
                      icon={<RulerIcon className="w-4 h-4" />}
                      value={skirtingDeduction}
                      onChange={(val) => {
                        setSkirtingDeduction(val);
                        markDirty();
                      }}
                      unit={dimensionUnit}
                      hint="مجموع عرض الأبواب المستثناة من الوزرة"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Installation Cost & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <InputControl
                id="installation"
                label={
                  installationMode === 'per_unit'
                    ? `تكلفة التركيب (${priceUnitLabel})`
                    : 'تكلفة التركيب (إجمالي)'
                }
                icon={<WrenchIcon className="w-4 h-4" />}
                value={installationCost}
                onChange={(val) => {
                  setInstallationCost(val);
                  markDirty();
                }}
                unit={currentCurrency.symbol}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  طريقة حساب التركيب
                </label>
                <SegmentedControl
                  ariaLabel="طريقة حساب التركيب"
                  options={[
                    { value: 'fixed', label: 'مبلغ ثابت' },
                    { value: 'per_unit', label: `لكل ${areaUnit}` },
                  ]}
                  selectedValue={installationMode}
                  onValueChange={handleInstallationModeChange}
                />
              </div>
            </div>

            {/* Separate Delivery Field */}
            <InputControl
              id="delivery"
              label="تكلفة التوصيل"
              icon={<TruckIcon className="w-4 h-4" />}
              value={deliveryCost}
              onChange={(val) => {
                setDeliveryCost(val);
                markDirty();
              }}
              unit={currentCurrency.symbol}
            />

            {/* Discount + Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <InputControl
                id="discount"
                label="نسبة الخصم (اختياري)"
                icon={<PercentIcon className="w-4 h-4" />}
                value={discountPercentage}
                onChange={(val) => {
                  setDiscountPercentage(val);
                  markDirty();
                }}
                unit="%"
                error={discountError}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  تطبيق الخصم على
                </label>
                <SegmentedControl
                  ariaLabel="تطبيق الخصم على"
                  options={[
                    { value: 'materials_only', label: 'المواد فقط' },
                    { value: 'all', label: 'كامل المبلغ' },
                  ]}
                  selectedValue={discountScope}
                  onValueChange={(val) => {
                    setDiscountScope(val as CostScope);
                    markDirty();
                  }}
                />
              </div>
            </div>

            {/* VAT + Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <InputControl
                id="vat"
                label="ضريبة القيمة المضافة"
                icon={<PercentIcon className="w-4 h-4" />}
                value={vatPercentage}
                onChange={(val) => {
                  setVatPercentage(val);
                  markDirty();
                }}
                unit="%"
                error={vatError}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  تطبيق الضريبة على
                </label>
                <SegmentedControl
                  ariaLabel="تطبيق الضريبة على"
                  options={[
                    { value: 'materials_only', label: 'المواد فقط' },
                    { value: 'all', label: 'كامل المبلغ' },
                  ]}
                  selectedValue={vatScope}
                  onValueChange={(val) => {
                    setVatScope(val as CostScope);
                    markDirty();
                  }}
                />
              </div>
            </div>

            {/* Final Calculate Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 no-print">
              {calculateError && (
                <p
                  ref={errorBannerRef}
                  className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <AlertIcon className="w-4 h-4 shrink-0" />
                  <span>{calculateError}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleCalculate}
                className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-bold text-base transition-colors flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <CalculatorIcon className="w-5 h-5" />
                <span>{submitted && isDirty ? 'تحديث حساب التكلفة' : 'احسب التكلفة'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Panel */}
      <aside
        ref={summaryRef}
        aria-label="ملخص التكلفة التقديرية"
        className="lg:col-span-5 lg:sticky lg:top-6 bg-slate-900 dark:bg-slate-900 border border-slate-800 dark:border-slate-700/80 text-white rounded-xl p-5 sm:p-7 print-full"
      >
        <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white leading-snug break-words">
              {submitted?.projectName ? submitted.projectName : 'ملخص التكلفة'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {submitted
                ? `${submitted.productLabel} · ${submitted.result.validRoomsCount} ${
                    submitted.result.validRoomsCount === 1 ? 'مساحة' : 'مساحات'
                  }`
                : `${currentProduct.label} · ${areas.length} ${
                    areas.length === 1 ? 'مساحة مضافة' : 'مساحات مضافة'
                  }`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0">
            <CalculatorIcon className="w-5 h-5" />
          </div>
        </div>

        {!submitted ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <AreaIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-xs mx-auto">
              <p className="text-base font-semibold text-white">جاهز لحساب التكلفة</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                {areas.length > 0
                  ? 'أكمل إدخال الأسعار والتركيب والتوصيل ثم اضغط على زر «احسب التكلفة» لعرض الملخص التفصيلي.'
                  : 'أضف مساحة واحدة على الأقل وأكمل تفاصيل التسعير، ثم اضغط على زر «احسب التكلفة».'}
              </p>
            </div>
            {areas.length === 0 && (
              <button
                type="button"
                onClick={handleFillSampleAndCalculate}
                className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors no-print focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                تعبئة مثال تجريبي وحسابه
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {isDirty && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-medium no-print">
                <AlertIcon className="w-4 h-4 shrink-0 text-amber-300" />
                <span>تم تعديل بعض المدخلات — اضغط «تحديث حساب التكلفة» لاعتماد التغييرات.</span>
              </div>
            )}

            {/* Area Breakdown */}
            <div className="space-y-2">
              {submitted.result.deductedArea > 0 && (
                <>
                  <ResultDisplay
                    label="مجموع المساحات المضافة"
                    value={`+ ${formatNumber(submitted.result.grossAddedArea)} ${summaryAreaUnit}`}
                    tone="muted"
                  />
                  <ResultDisplay
                    label="المساحات المستثناة"
                    value={`− ${formatNumber(submitted.result.deductedArea)} ${summaryAreaUnit}`}
                    tone="muted"
                  />
                </>
              )}

              <ResultDisplay
                label="المساحة الصافية"
                value={`${formatNumber(submitted.result.netArea)} ${summaryAreaUnit}`}
                icon={<AreaIcon className="w-5 h-5" />}
              />

              {submitted.result.wastePercentage > 0 && (
                <ResultDisplay
                  label={`هدر وقص (${formatCleanDecimal(submitted.result.wastePercentage)}%)`}
                  value={`+ ${formatNumber(submitted.result.wasteArea)} ${summaryAreaUnit}`}
                  tone="muted"
                />
              )}

              {submitted.result.boxesCount !== null ? (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-xs text-slate-400">المساحة المطلوبة مع الهدر</span>
                    <span className="text-sm font-medium text-slate-300 tabular-nums">
                      {formatNumber(submitted.result.requiredAreaWithWaste)} {summaryAreaUnit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-teal-300">
                      عدد الكراتين المطلوبة
                    </span>
                    <div className="text-end tabular-nums">
                      <span className="text-lg font-bold text-teal-300">
                        {submitted.result.boxesCount} كرتون
                      </span>
                      <span className="block text-xs text-slate-400">
                        تغطي {formatNumber(submitted.result.totalAreaToBuy)} {summaryAreaUnit} ·{' '}
                        {formatCleanDecimal(submitted.result.boxCoverage)} {summaryAreaUnit}/كرتون
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline justify-between gap-4 pt-2 border-t border-slate-800/80">
                  <span className="text-sm font-medium text-teal-300">
                    المساحة المطلوب شراؤها
                  </span>
                  <div className="text-end tabular-nums">
                    <span className="text-base font-bold text-teal-300">
                      {formatNumber(submitted.result.totalAreaToBuy)} {summaryAreaUnit}
                    </span>
                    <span className="block text-xs text-slate-400">
                      ≈ {formatNumber(submitted.result.equivalentOtherUnitArea)}{' '}
                      {summaryOtherAreaUnit}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Per-Room Summary when multiple rooms */}
            {submitted.result.roomBreakdowns.filter((r) => r.isValid).length > 1 && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 mb-2">تفصيل المساحات</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pe-1">
                  {submitted.result.roomBreakdowns
                    .filter((r) => r.isValid)
                    .map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-wrap items-baseline justify-between text-xs text-slate-300 gap-x-3 gap-y-0.5"
                      >
                        <span className="font-medium text-slate-200 break-words">
                          {room.operation === 'subtract' ? '− ' : '+ '}
                          {room.name}
                        </span>
                        <span className="tabular-nums text-slate-400 shrink-0">
                          {formatCleanDecimal(room.length)} × {formatCleanDecimal(room.width)} ={' '}
                          <strong className="text-slate-100 font-semibold">
                            {formatNumber(room.area)} {summaryAreaUnit}
                          </strong>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <ResultDisplay
                label="تكلفة المواد"
                subLabel={
                  submitted.priceIncludesVat
                    ? `${formatNumber(submitted.result.totalAreaToBuy)} ${summaryAreaUnit} · صافي قبل الضريبة`
                    : `${formatNumber(submitted.result.totalAreaToBuy)} ${summaryAreaUnit}`
                }
                value={formatCurrency(submitted.result.materialCost, summaryCurrencySymbol)}
              />
              {submitted.result.includeSkirting && (
                <ResultDisplay
                  label="الوزرة / النعلات"
                  subLabel={`${formatNumber(submitted.result.netSkirtingLength)} ${summaryDimensionUnit}`}
                  value={formatCurrency(submitted.result.skirtingCost, summaryCurrencySymbol)}
                />
              )}
              <ResultDisplay
                label="تكلفة التركيب"
                subLabel={
                  submitted.installationMode === 'per_unit'
                    ? `حسب المساحة الصافية (${formatNumber(submitted.result.netArea)} ${summaryAreaUnit})`
                    : 'مبلغ إجمالي ثابت'
                }
                value={formatCurrency(submitted.result.installationCost, summaryCurrencySymbol)}
              />
              <ResultDisplay
                label="تكلفة التوصيل"
                value={formatCurrency(submitted.result.deliveryCost, summaryCurrencySymbol)}
              />
              {submitted.result.discountAmount > 0 && (
                <ResultDisplay
                  label={`الخصم (${formatCleanDecimal(submitted.result.discountRate)}%)`}
                  subLabel={
                    submitted.result.discountScope === 'materials_only'
                      ? 'على قيمة المواد فقط'
                      : 'على كامل المبلغ'
                  }
                  value={`- ${formatCurrency(submitted.result.discountAmount, summaryCurrencySymbol)}`}
                  tone="discount"
                />
              )}
              <ResultDisplay
                label={`ضريبة القيمة المضافة (${formatCleanDecimal(submitted.result.vatRate)}%)`}
                subLabel={
                  submitted.result.vatScope === 'materials_only'
                    ? 'على قيمة المواد فقط'
                    : 'على كامل المبلغ'
                }
                value={formatCurrency(submitted.result.vatAmount, summaryCurrencySymbol)}
              />
            </div>

            {/* Visual Cost Composition Bar */}
            {(submitted.result.materialCost > 0 ||
              submitted.result.skirtingCost > 0 ||
              submitted.result.installationCost > 0 ||
              submitted.result.deliveryCost > 0 ||
              submitted.result.vatAmount > 0) && (
              <div className="pt-2 space-y-2">
                <div
                  className="h-2 w-full rounded-full overflow-hidden flex bg-slate-800"
                  aria-label="نسب مكونات التكلفة"
                >
                  {costBreakdownShares.materialPct > 0 && (
                    <div
                      style={{ width: `${costBreakdownShares.materialPct}%` }}
                      className="bg-teal-400 h-full"
                    />
                  )}
                  {costBreakdownShares.installPct > 0 && (
                    <div
                      style={{ width: `${costBreakdownShares.installPct}%` }}
                      className="bg-sky-400 h-full"
                    />
                  )}
                  {costBreakdownShares.deliveryPct > 0 && (
                    <div
                      style={{ width: `${costBreakdownShares.deliveryPct}%` }}
                      className="bg-violet-400 h-full"
                    />
                  )}
                  {costBreakdownShares.vatPct > 0 && (
                    <div
                      style={{ width: `${costBreakdownShares.vatPct}%` }}
                      className="bg-amber-400 h-full"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-teal-400" aria-hidden="true" />
                    المواد {Math.round(costBreakdownShares.materialPct)}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-sky-400" aria-hidden="true" />
                    التركيب {Math.round(costBreakdownShares.installPct)}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-violet-400" aria-hidden="true" />
                    التوصيل {Math.round(costBreakdownShares.deliveryPct)}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-amber-400" aria-hidden="true" />
                    الضريبة {Math.round(costBreakdownShares.vatPct)}%
                  </span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="pt-4 border-t border-slate-700 space-y-2">
              <ResultDisplay
                label="التكلفة الإجمالية"
                subLabel={`شامل ${summaryCurrencyLabel}`}
                value={formatCurrency(submitted.result.grandTotal, summaryCurrencySymbol)}
                icon={<WalletIcon className="w-5 h-5" />}
                isLarge
              />
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>التكلفة الفعلية الشاملة لكل {summaryAreaUnit} صافي</span>
                <span className="tabular-nums font-semibold text-slate-200">
                  {formatCurrency(
                    submitted.result.effectiveCostPerNetUnit,
                    summaryCurrencySymbol
                  )}{' '}
                  / {summaryAreaUnit}
                </span>
              </div>
            </div>

            {/* Action Buttons: Copy, WhatsApp, Save, Print & Reset with Confirmation */}
            <div className="pt-3 space-y-2.5 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  <span>{copied ? 'تم نسخ الملخص' : 'نسخ عرض السعر'}</span>
                </button>

                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>مشاركة واتساب</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveProject}
                  className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  {savedNotice ? (
                    <CheckIcon className="w-4 h-4 text-teal-400" />
                  ) : (
                    <BookmarkIcon className="w-4 h-4" />
                  )}
                  <span>{savedNotice ? 'تم حفظ العرض' : 'حفظ العرض'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>طباعة / حفظ PDF</span>
                </button>
              </div>

              {!confirmingReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-lg border border-slate-700/80 text-slate-300 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 font-medium text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <ResetIcon className="w-4 h-4" />
                  <span>إعادة ضبط وبدء حساب جديد</span>
                </button>
              ) : (
                <div
                  role="alertdialog"
                  aria-labelledby="reset-confirm-title"
                  className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3.5 space-y-3"
                >
                  <div className="flex items-start gap-2.5 text-xs text-amber-100 leading-relaxed">
                    <AlertIcon className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <p id="reset-confirm-title">
                      تنبيه: سيتم حذف جميع المساحات والبيانات المدخلة حالياً للبدء من جديد. هل تريد
                      المتابعة؟
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="min-h-[44px] py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      تأكيد الحذف
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      className="min-h-[44px] py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Calculator;
