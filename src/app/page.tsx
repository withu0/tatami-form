"use client";

import { useMemo, useState } from "react";
import { Shippori_Mincho } from "next/font/google";

const shipporimincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type RoomTypeKey = "detached" | "mansion" | "living" | "unknown";
type SizeKey = "small" | "six" | "eightPlus" | "custom";
type WorkKey = "replace" | "new" | "okidatami" | "unknown";
type UsageKey = "daily" | "kids" | "pets" | "care" | "unknown";
type PriorityKey = "cost" | "health" | "durability" | "design" | "unknown";
type MaterialKey = "igusa_cn" | "igusa_jp" | "resin" | "washi" | "any";
type GradeKey = "economy" | "standard" | "premium" | "deluxe";

const ROOM_TYPE_COEF: Record<RoomTypeKey, number> = {
  detached: 1.0,
  mansion: 1.15,
  living: 0.95,
  unknown: 1.1,
};

const SIZE_PRESETS: Record<SizeKey, { tatami: number; coef: number } | null> = {
  small: { tatami: 4.5, coef: 1.2 },
  six: { tatami: 6, coef: 1.0 },
  eightPlus: { tatami: 8, coef: 0.95 },
  custom: null,
};

function calcSizeCoefFromTatami(tatami: number): number {
  if (!tatami || Number.isNaN(tatami)) return 1.0;
  if (tatami < 4.5) return 1.2;
  if (tatami <= 6) return 1.0;
  if (tatami < 8) return 0.98;
  return 0.95;
}

const WORK_COEF: Record<WorkKey, number> = {
  replace: 1.0,
  new: 1.8,
  okidatami: 1.3,
  unknown: 1.3,
};

const USAGE_COEF: Record<UsageKey, number> = {
  daily: 1.0,
  kids: 1.15,
  pets: 1.25,
  care: 1.35,
  unknown: 1.0,
};

const PRIORITY_COEF: Record<PriorityKey, number> = {
  cost: 0.9,
  health: 1.2,
  durability: 1.15,
  design: 1.25,
  unknown: 1.0,
};

const MATERIAL_COEF: Record<MaterialKey, number> = {
  igusa_cn: 1.0,
  igusa_jp: 1.0,
  resin: 0.95,
  washi: 1.1,
  any: 0.9,
};

// 追加オプション料金（1畳あたり、必要に応じて自動適用）
const ADD_ONS = {
  antibacterial: 800,
  antiMite: 1000,
  antiMold: 800,
  deodorize: 1200,
  antiSoil: 1000,
  durable: 1500,
  antiSlip: 1200,
  designEdge: 1500,
  colorTatami: 2000,
};

type PriceTable = Record<
  "表替え" | "新規導入" | "置き畳",
  Record<MaterialKey, Record<GradeKey, number>>
>;

const PRICE_TABLE: PriceTable = {
  表替え: {
    igusa_cn: { economy: 5500, standard: 6500, premium: 7500, deluxe: 9000 },
    igusa_jp: { economy: 8000, standard: 9000, premium: 10500, deluxe: 12000 },
    resin: { economy: 6000, standard: 7000, premium: 8500, deluxe: 10000 },
    washi: { economy: 7500, standard: 9000, premium: 11000, deluxe: 13000 },
    any: { economy: 6000, standard: 7000, premium: 8500, deluxe: 10000 }, // 標準扱い
  },
  新規導入: {
    igusa_cn: { economy: 11000, standard: 13000, premium: 15000, deluxe: 17000 },
    igusa_jp: { economy: 16000, standard: 18000, premium: 21000, deluxe: 25000 },
    resin: { economy: 12000, standard: 14000, premium: 16500, deluxe: 19000 },
    washi: { economy: 15000, standard: 17500, premium: 20000, deluxe: 23000 },
    any: { economy: 12000, standard: 14000, premium: 16500, deluxe: 19000 },
  },
  置き畳: {
    igusa_cn: { economy: 4500, standard: 5500, premium: 6500, deluxe: 7500 },
    igusa_jp: { economy: 6500, standard: 7500, premium: 9000, deluxe: 10500 },
    resin: { economy: 5000, standard: 6000, premium: 7000, deluxe: 8500 },
    washi: { economy: 6000, standard: 7000, premium: 8500, deluxe: 10000 },
    any: { economy: 5000, standard: 6000, premium: 7000, deluxe: 8500 },
  },
};

function formatJPY(value: number): string {
  return value.toLocaleString("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
}

export default function Home() {
  // Q1
  const [roomType, setRoomType] = useState<RoomTypeKey | null>(null);

  // Q2
  const [sizeKey, setSizeKey] = useState<SizeKey | null>(null);
  const [customTatami, setCustomTatami] = useState<number | "">("");

  // Q3
  const [work, setWork] = useState<WorkKey | null>(null);

  // Q4
  const [usage, setUsage] = useState<UsageKey | null>(null);

  // Q5
  const [priority, setPriority] = useState<PriorityKey | null>(null);

  // Q6 + グレード
  const [material, setMaterial] = useState<MaterialKey | null>(null);
  const [grade, setGrade] = useState<GradeKey>("standard");

  const answeredCount = useMemo(() => {
    const answers = [roomType, sizeKey, work, usage, priority, material];
    return answers.filter((v) => {
      if (v === null) return false;
      if (v === "custom") return customTatami !== ""; // ensure input provided
      return true;
    }).length;
  }, [roomType, sizeKey, work, usage, priority, material, customTatami]);

  const tatamiCount = useMemo(() => {
    if (sizeKey === "custom") return Number(customTatami) || 0;
    if (!sizeKey) return 0;
    return SIZE_PRESETS[sizeKey]?.tatami ?? 0;
  }, [sizeKey, customTatami]);

  const quantityCoef = useMemo(() => {
    if (sizeKey && SIZE_PRESETS[sizeKey]) return SIZE_PRESETS[sizeKey]!.coef;
    if (sizeKey === "custom") return calcSizeCoefFromTatami(Number(customTatami) || 0);
    return 1.0;
  }, [sizeKey, customTatami]);

  const stepSpread = useMemo(() => {
    // 回答済質問数に応じた±幅
    switch (answeredCount) {
      case 1:
        return 0.5; // ±50%
      case 2:
        return 0.4; // ±40%
      case 3:
        return 0.3; // ±30%
      case 4:
        return 0.2; // ±20%
      case 5:
        return 0.15; // ±15%
      case 6:
        return 0.1; // ±10%
      default:
        return 0.6; // 未入力時は広め
    }
  }, [answeredCount]);

  const accuracy = useMemo(() => {
    switch (answeredCount) {
      case 1:
        return 10;
      case 2:
        return 25;
      case 3:
        return 40;
      case 4:
        return 60;
      case 5:
        return 80;
      case 6:
        return 95;
      default:
        return 0;
    }
  }, [answeredCount]);

  const baseUnitPrice = useMemo(() => {
    const workKey = work ?? "unknown";
    let tableKey: keyof PriceTable = "表替え";
    if (workKey === "new") tableKey = "新規導入";
    else if (workKey === "okidatami") tableKey = "置き畳";

    const mat = material ?? "resin"; // こだわりなし時の無難な基準
    return PRICE_TABLE[tableKey][mat][grade];
  }, [work, material, grade]);

  const addOnPerTatami = useMemo(() => {
    let add = 0;
    if (usage === "kids") add += ADD_ONS.antibacterial + ADD_ONS.antiMite;
    if (usage === "pets") add += ADD_ONS.deodorize + ADD_ONS.antiSoil + ADD_ONS.durable;
    if (usage === "care") add += ADD_ONS.antiSlip + ADD_ONS.antiMold;

    if (priority === "health") add += ADD_ONS.antibacterial + ADD_ONS.antiMite + ADD_ONS.antiMold;
    if (priority === "durability") add += ADD_ONS.antiSoil + ADD_ONS.durable;
    if (priority === "design") add += ADD_ONS.designEdge + ADD_ONS.colorTatami;
    return add;
  }, [usage, priority]);

  const step1Only = answeredCount <= 3; // ①②③ までが揃えば概算

  const result = useMemo(() => {
    const tatami = tatamiCount;
    if (!tatami || !roomType || !sizeKey || !work) return null;

    const typeCoef = ROOM_TYPE_COEF[roomType];
    const qtyCoef = quantityCoef;
    const workCoef = WORK_COEF[work];

    const base = baseUnitPrice * tatami * typeCoef * qtyCoef * workCoef;

    if (step1Only || !usage || !priority || !material) {
      const spread = 0.3; // STEP1の定義（①②③が埋まっている場合）
      const low = base * (1 - spread);
      const high = base * (1 + spread);
      return { price: base, low, high };
    }

    const usageCoef = USAGE_COEF[usage];
    const priorityCoef = PRIORITY_COEF[priority];
    const materialCoef = MATERIAL_COEF[material];

    const detailed = base * usageCoef * priorityCoef * materialCoef;
    const totalAddOns = addOnPerTatami * tatami; // 加算は係数計算とは独立
    const final = detailed + totalAddOns;
    const spread = 0.1; // STEP2 ±10%
    const low = final * (1 - spread);
    const high = final * (1 + spread);
    return { price: final, low, high };
  }, [
    tatamiCount,
    roomType,
    sizeKey,
    work,
    usage,
    priority,
    material,
    baseUnitPrice,
    quantityCoef,
    addOnPerTatami,
    step1Only,
  ]);

  const roundedRange = useMemo(() => {
    if (!result) return null;
    // 回答数に応じた幅で再補正（セクション4のマトリクス）
    const center = result.price;
    const low = center * (1 - stepSpread);
    const high = center * (1 + stepSpread);
    return { low: Math.round(low), high: Math.round(high) };
  }, [result, stepSpread]);

  const steps = [1, 2, 3, 4, 5, 6].map((n) => n <= answeredCount);
  // Wizard controls
  const totalSteps = 6;
  const [currentStep, setCurrentStep] = useState<number>(1);

  // function isStepAnswered(step: number): boolean {
  //   switch (step) {
  //     case 1:
  //       return roomType !== null;
  //     case 2:
  //       if (sizeKey === null) return false;
  //       if (sizeKey === "custom") return customTatami !== "" && Number(customTatami) > 0;
  //       return true;
  //     case 3:
  //       return work !== null;
  //     case 4:
  //       return usage !== null;
  //     case 5:
  //       return priority !== null;
  //     case 6:
  //       return material !== null;
  //     default:
  //       return false;
  //   }
  // }

  function goNext() {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => Math.min(totalSteps, s + 1));
    }
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  const stepTitles = [
    "① お部屋のタイプ（タイプ係数）",
    "② お部屋の広さ（数量係数）",
    "③ 施工内容（施工係数）",
    "④ 用途（機能係数）",
    "⑤ 重視するポイント（オプション係数）",
    "⑥ 畳の素材・タイプ（材質係数）",
  ];

  return (
    <main className={`min-h-screen bg-[#f6f4ee] text-[#2b3a2e] py-6 px-4 ${shipporimincho.className}`}>
      <div className="mx-auto w-full max-w-[980px]">
        {/* Progress / Accuracy */}
        <div className="mt-4 bg-transparent px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-lg font-extrabold text-[#38542A]">{accuracy}%</span>
            <span className="font-bold text-[#38542A] text-righ">見積もり精度</span>
          </div>
          <div className="mb-2 grid grid-cols-6">
            {steps.map((done, i) => (
              <div key={i} className={`h-2  ${done ? "bg-[#38542A]" : "bg-[#DADFD6]"}`} />
            ))}
          </div>
          <p className="text-sm text-[#385243]">
            回答が進むほど金額の幅が狭まり、精度が上がります。
          </p>
        </div>
        <div className=" flex items-center justify-start mb-[10px]">
          <span className="pr-5">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
              <path d="M22.798 29.86C21.6887 29.8773 20.4493 29.99 19.08 30.198H19.002C18.9327 30.198 18.872 30.1547 18.82 30.068L18.352 29.08C18.3347 29.0627 18.326 29.028 18.326 28.976C18.326 28.8893 18.3867 28.846 18.508 28.846C19.4613 28.9327 20.5187 28.9933 21.68 29.028H36.032L37.982 26.194C38.0513 26.0727 38.1467 26.064 38.268 26.168C38.6667 26.5147 39.1693 26.974 39.776 27.546C40.4 28.118 41.024 28.7073 41.648 29.314C41.7347 29.4007 41.7607 29.4787 41.726 29.548C41.622 29.756 41.3793 29.86 40.998 29.86H22.798Z" fill="white" />
            </svg>
          </span>

          <h1 className="mb-4 bg-transparent text-[26px] font-bold tracking-wide">
            畳の概算見積もりシミュレーター
          </h1>
        </div>

        <div className="overflow-hidden bg-transparent">
          <img
            alt="畳のある和室"
            src="/bg.png"
            className="block h-[300px] w-full object-cover md:h-[420px]"
          />
        </div>


        {/* Wizard (one question per step) */}
        <section className="mt-6">
          <div className="mb-2 text-sm text-[#385243]">Step {currentStep} / {totalSteps}</div>
          <h2 className="mb-3 text-lg font-bold">{stepTitles[currentStep - 1]}</h2>

          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {(
                [
                  { key: "detached", label: "一戸建ての和室", sub: "係数1.00" },
                  { key: "mansion", label: "マンションの和室", sub: "係数1.15" },
                  { key: "living", label: "リビング・洋室", sub: "係数0.95" },
                  { key: "unknown", label: "その他・わからない", sub: "係数1.10" },
                ] as { key: RoomTypeKey; label: string; sub: string }[]
              ).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => {
                    setRoomType(key);
                    setCurrentStep((s) => Math.min(totalSteps, s + 1));
                  }}
                  className={` border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${roomType === key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                    }`}
                >
                  <div>{label}</div>
                  <div className="text-xs opacity-80">{sub}</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {(
                  [
                    { key: "small", label: "4畳半以下（小さい部屋）", sub: "係数1.20 / 4.5畳" },
                    { key: "six", label: "6畳（一般的な部屋）", sub: "係数1.00 / 6畳" },
                    { key: "eightPlus", label: "8畳以上（広めの部屋）", sub: "係数0.95 / 8畳" },
                    { key: "custom", label: "わからない・入力する", sub: "畳数を入力" },
                  ] as { key: SizeKey; label: string; sub: string }[]
                ).map(({ key, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSizeKey(key);
                      if (key !== "custom") setCurrentStep((s) => Math.min(totalSteps, s + 1));
                    }}
                    className={`border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${sizeKey === key
                        ? "border-[#38542A] bg-[#38542A] text-white"
                        : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    <div className="text-xs opacity-80">{sub}</div>
                  </button>
                ))}
              </div>
              {sizeKey === "custom" && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm">畳数</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    placeholder="例: 5.5"
                    className="w-32 border border-[#38542A] bg-white px-3 py-2 shadow-sm"
                    value={customTatami}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setCustomTatami(v);
                      if (v !== "" && Number(v) > 0) setCurrentStep((s) => Math.min(totalSteps, s + 1));
                    }}
                  />
                  <div className="text-sm opacity-80">係数 {calcSizeCoefFromTatami(Number(customTatami) || 0).toFixed(2)}</div>
                </div>
              )}
            </>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {(
                [
                  { key: "replace", label: "張り替え（表替え・交換）", sub: "係数1.00" },
                  { key: "new", label: "新規で畳を導入したい", sub: "係数1.80" },
                  { key: "okidatami", label: "置き畳タイプが欲しい", sub: "係数1.30" },
                  { key: "unknown", label: "わからない・相談", sub: "係数1.30" },
                ] as { key: WorkKey; label: string; sub: string }[]
              ).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => {
                    setWork(key);
                    setCurrentStep((s) => Math.min(totalSteps, s + 1));
                  }}
                  className={`border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${work === key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                    }`}
                >
                  <div>{label}</div>
                  <div className="text-xs opacity-80">{sub}</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {(
                [
                  { key: "daily", label: "普段の生活", sub: "係数1.00" },
                  { key: "kids", label: "子ども部屋", sub: "係数1.15" },
                  { key: "pets", label: "ペットがいる部屋", sub: "係数1.25" },
                  { key: "care", label: "介護・お風呂用", sub: "係数1.35" },
                ] as { key: UsageKey; label: string; sub: string }[]
              ).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => {
                    setUsage(key);
                    setCurrentStep((s) => Math.min(totalSteps, s + 1));
                  }}
                  className={`border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${usage === key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                    }`}
                >
                  <div>{label}</div>
                  <div className="text-xs opacity-80">{sub}</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 5 */}
          {currentStep === 5 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {(
                [
                  { key: "cost", label: "コスト重視", sub: "係数0.90" },
                  { key: "health", label: "健康・機能性重視", sub: "係数1.20" },
                  { key: "durability", label: "耐久性重視", sub: "係数1.15" },
                  { key: "design", label: "デザイン重視", sub: "係数1.25" },
                ] as { key: PriorityKey; label: string; sub: string }[]
              ).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => {
                    setPriority(key);
                    setCurrentStep((s) => Math.min(totalSteps, s + 1));
                  }}
                  className={`border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${priority === key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                    }`}
                >
                  <div>{label}</div>
                  <div className="text-xs opacity-80">{sub}</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 6 */}
          {currentStep === 6 && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {(
                  [
                    { key: "igusa_cn", label: "天然い草（中国産）", sub: "係数1.00" },
                    { key: "igusa_jp", label: "天然い草（国産）", sub: "係数1.00" },
                    { key: "resin", label: "樹脂畳", sub: "係数0.95" },
                    { key: "washi", label: "和紙畳", sub: "係数1.10" },
                  ] as { key: MaterialKey; label: string; sub: string }[]
                ).map(({ key, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => setMaterial(key)}
                    className={`border-2 px-4 py-3 text-left font-bold shadow-sm transition-colors ${material === key
                        ? "border-[#38542A] bg-[#38542A] text-white"
                        : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    <div className="text-xs opacity-80">{sub}</div>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm">グレード</label>
                <select
                  className="w-48 border border-[#38542A] bg-white px-3 py-2 shadow-sm"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeKey)}
                >
                  <option value="economy">エコノミー</option>
                  <option value="standard">スタンダード</option>
                  <option value="premium">プレミアム</option>
                  <option value="deluxe">デラックス</option>
                </select>
                <div className="text-sm opacity-80">基準単価: {formatJPY(baseUnitPrice)} / {work === "okidatami" ? "枚" : "畳"}</div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={goPrev}
              className={`border-2 px-4 py-2 font-bold shadow-sm ${currentStep === 1
                  ? "cursor-not-allowed border-[#AEB7A8] bg-[#E7EBE3] text-[#7a857d]"
                  : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                }`}
              disabled={currentStep === 1}
            >
              戻る
            </button>
            <button
              onClick={goNext}
              className={`border-2 px-6 py-2 font-bold shadow-sm ${true
                  ? "border-[#38542A] bg-[#38542A] text-white hover:bg-[#254e33]"
                  : "cursor-not-allowed border-[#AEB7A8] bg-[#E7EBE3] text-[#7a857d]"
                }`}
              disabled={currentStep === totalSteps}
            >
              次へ
            </button>
          </div>
        </section>

        {/* Estimate Card */}
        <div className="mt-6 border-2 border-[#38542A] bg-white p-5">
          <div className="mb-2 text-sm text-[#385243]">現在の試算</div>
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-[22px] font-extrabold text-[#38542A]">
              {roundedRange ? (
                <>
                  {formatJPY(roundedRange.low)} ～ {formatJPY(roundedRange.high)}
                </>
              ) : (
                "金額を表示するにはいくつかの質問にお答えください"
              )}
            </div>
            <div className="text-sm text-[#385243]">
              畳数: {tatamiCount || 0} / 単価: {formatJPY(baseUnitPrice)} / 係数合計: {(
                (roomType ? ROOM_TYPE_COEF[roomType] : 1) *
                quantityCoef *
                (work ? WORK_COEF[work] : 1) *
                (usage ? USAGE_COEF[usage] : 1) *
                (priority ? PRIORITY_COEF[priority] : 1) *
                (material ? MATERIAL_COEF[material] : 1)
              ).toFixed(2)}
              {addOnPerTatami > 0 ? ` / 追加加工 ${formatJPY(addOnPerTatami)}×${tatamiCount || 0}` : ""}
            </div>
          </div>
          <div className="mt-2 text-sm text-[#385243]">
            精度見込み: <span className="font-bold text-[#38542A]">{accuracy}%</span>（幅 ±{Math.round(stepSpread * 100)}%）
          </div>
        </div>
      </div>
    </main>
  );
}
