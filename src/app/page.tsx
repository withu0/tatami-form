"use client";

import React, { useMemo, useState } from "react";
import { Shippori_Mincho } from "next/font/google";
import Image from "next/image";

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
    "お部屋のタイプはどれに近いですか？",
    "お部屋の畳の広さ(畳数)はどれくらいですか？",
    "今回は新規？張り替え？",
    "どんな用途で使いますか？",
    "特に重視するポイントは？",
    "好みの畳のスタイルは？",
  ];

  const stepImageMap: Record<number, string> = {
    1: "/1.png",
    2: "/2.png",
    3: "/3.png",
    4: "/4.png",
    5: "/5.png",
    6: "/6.png",
  };

  const IconSvgMap: Record<number, React.ReactNode> = {
    1:
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
        <path d="M22.798 29.86C21.6887 29.8773 20.4493 29.99 19.08 30.198H19.002C18.9327 30.198 18.872 30.1547 18.82 30.068L18.352 29.08C18.3347 29.0627 18.326 29.028 18.326 28.976C18.326 28.8893 18.3867 28.846 18.508 28.846C19.4613 28.9327 20.5187 28.9933 21.68 29.028H36.032L37.982 26.194C38.0513 26.0727 38.1467 26.064 38.268 26.168C38.6667 26.5147 39.1693 26.974 39.776 27.546C40.4 28.118 41.024 28.7073 41.648 29.314C41.7347 29.4007 41.7607 29.4787 41.726 29.548C41.622 29.756 41.3793 29.86 40.998 29.86H22.798Z" fill="white" />
      </svg>,
    2:
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
        <path d="M34.758 22.67C34.8447 22.566 34.9573 22.41 35.096 22.202C35.2347 21.994 35.3733 21.812 35.512 21.656C35.6507 21.4827 35.7547 21.396 35.824 21.396C35.928 21.396 36.2487 21.6127 36.786 22.046C37.3407 22.4793 37.8607 22.93 38.346 23.398C38.8313 23.8487 39.074 24.1347 39.074 24.256C39.0567 24.3947 38.9787 24.4987 38.84 24.568C38.7013 24.6373 38.5453 24.672 38.372 24.672H25.346C24.1153 24.6893 22.8153 24.8107 21.446 25.036L20.77 23.736C21.7233 23.84 22.876 23.9093 24.228 23.944H33.9L34.758 22.67ZM22.928 39.31C21.6973 39.3273 20.3973 39.4487 19.028 39.674L18.352 38.348C19.3053 38.452 20.458 38.5213 21.81 38.556H36.292L38.19 35.956C39.646 37.152 40.7813 38.1313 41.596 38.894C41.5787 39.0327 41.5007 39.1367 41.362 39.206C41.2233 39.2753 41.0673 39.31 40.894 39.31H22.928Z" fill="white" />
      </svg>,
    3:
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
        <path d="M36.37 19.902C36.4393 19.798 36.5607 19.6333 36.734 19.408C36.9073 19.1653 37.046 18.992 37.15 18.888C37.254 18.7667 37.3407 18.706 37.41 18.706C37.566 18.706 38.0773 19.0613 38.944 19.772C39.828 20.4827 40.3567 20.9853 40.53 21.28C40.5647 21.3493 40.582 21.3927 40.582 21.41C40.582 21.5313 40.5127 21.6353 40.374 21.722C40.2353 21.7913 40.062 21.826 39.854 21.826H24.046C22.9367 21.8433 21.6973 21.956 20.328 22.164H20.25C20.1807 22.164 20.12 22.1207 20.068 22.034L19.626 21.124C19.6087 21.1067 19.6 21.072 19.6 21.02C19.6 20.9333 19.6607 20.89 19.782 20.89C20.7353 20.9767 21.7927 21.0373 22.954 21.072H35.538L36.37 19.902ZM34.446 28.508C34.55 28.3867 34.68 28.222 34.836 28.014C34.992 27.7887 35.1133 27.624 35.2 27.52C35.304 27.416 35.3907 27.364 35.46 27.364C35.616 27.364 36.1187 27.7107 36.968 28.404C37.8173 29.08 38.3287 29.5567 38.502 29.834C38.554 29.9207 38.554 30.0073 38.502 30.094C38.398 30.2847 38.1727 30.38 37.826 30.38H25.736C24.6267 30.3973 23.3873 30.51 22.018 30.718H21.94C21.8707 30.718 21.81 30.6747 21.758 30.588L21.29 29.678C21.2727 29.6607 21.264 29.626 21.264 29.574C21.264 29.4873 21.3247 29.444 21.446 29.444C22.3993 29.5307 23.4567 29.5913 24.618 29.626H33.64L34.446 28.508ZM37.618 37.842C37.7047 37.738 37.8173 37.582 37.956 37.374C38.3373 36.8713 38.58 36.62 38.684 36.62C38.84 36.62 39.3687 36.984 40.27 37.712C41.1713 38.44 41.7087 38.9513 41.882 39.246C41.9167 39.3153 41.934 39.3587 41.934 39.376C41.934 39.4973 41.8647 39.6013 41.726 39.688C41.5873 39.7573 41.414 39.792 41.206 39.792H22.694C21.5847 39.8093 20.3453 39.922 18.976 40.13H18.898C18.8287 40.13 18.768 40.0867 18.716 40L18.274 39.116C18.2567 39.0987 18.248 39.064 18.248 39.012C18.248 38.9253 18.3087 38.882 18.43 38.882C19.3833 38.9687 20.4407 39.0293 21.602 39.064H36.76L37.618 37.842Z" fill="white" />
      </svg>,
    4:
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
        <path d="M22.616 39.35C22.6333 39.5233 22.642 39.662 22.642 39.766C22.642 39.87 22.6507 39.9567 22.668 40.026V40.156C22.668 40.312 22.5467 40.4853 22.304 40.676C22.0613 40.8667 21.7493 41.0313 21.368 41.17C21.004 41.3087 20.6313 41.378 20.25 41.378C20.0073 41.378 19.8167 41.326 19.678 41.222C19.5393 41.118 19.47 40.9967 19.47 40.858C19.5393 39.8353 19.6 38.8473 19.652 37.894C19.704 36.9233 19.7387 35.658 19.756 34.098V25.388C19.756 23.3427 19.6607 21.6613 19.47 20.344V20.292C19.47 20.2227 19.4873 20.1793 19.522 20.162C19.5567 20.1273 19.6087 20.1273 19.678 20.162L22.824 21.488H37.046L37.67 20.682C37.7393 20.5953 37.8347 20.4827 37.956 20.344C38.0947 20.188 38.1987 20.0753 38.268 20.006C38.3547 19.9193 38.4327 19.876 38.502 19.876C38.658 19.876 39.0913 20.162 39.802 20.734C40.53 21.306 40.9807 21.7393 41.154 22.034C41.206 22.1033 41.1887 22.1813 41.102 22.268C40.842 22.4933 40.53 22.6407 40.166 22.71V33.994C40.2007 36.1607 40.27 38.1453 40.374 39.948C40.374 40.052 40.3393 40.1387 40.27 40.208C40.062 40.416 39.698 40.624 39.178 40.832C38.6753 41.0573 38.2073 41.17 37.774 41.17C37.4447 41.17 37.2453 41.04 37.176 40.78C37.176 40.676 37.1847 40.5893 37.202 40.52L37.28 39.636V38.856H22.616V39.35ZM22.616 38.128H37.28V22.216H33.224V30.276C33.224 30.4493 33.25 30.5707 33.302 30.64C33.354 30.692 33.458 30.718 33.614 30.718H34.212C34.5413 30.718 34.7493 30.7093 34.836 30.692C35.0613 30.6573 35.2087 30.5793 35.278 30.458C35.434 30.2327 35.6767 29.47 36.006 28.17C36.0233 28.0487 36.0927 27.988 36.214 27.988C36.3007 27.988 36.344 28.0573 36.344 28.196L36.448 30.536C36.7253 30.692 36.916 30.8653 37.02 31.056C37.124 31.2293 37.176 31.4547 37.176 31.732C37.176 32.2693 36.9247 32.668 36.422 32.928C35.9367 33.188 35.1133 33.318 33.952 33.318H32.782C32.1753 33.318 31.7247 33.2487 31.43 33.11C31.1353 32.9713 30.936 32.746 30.832 32.434C30.7453 32.122 30.702 31.654 30.702 31.03V22.216H28.57C28.518 24.4 28.362 26.2113 28.102 27.65C27.8593 29.0713 27.3307 30.3973 26.516 31.628C25.7187 32.8413 24.514 33.8987 22.902 34.8C22.8153 34.8693 22.72 34.852 22.616 34.748V38.128ZM22.616 34.358C23.604 33.3527 24.332 32.2433 24.8 31.03C25.268 29.8167 25.554 28.5773 25.658 27.312C25.762 26.0293 25.8227 24.3307 25.84 22.216H22.616V34.358Z" fill="white" />
      </svg>,
    5: <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
      <path d="M33.9 28.274C33.9867 28.17 34.1253 28.014 34.316 27.806C34.5067 27.5807 34.654 27.468 34.758 27.468C34.914 27.468 35.3473 27.7627 36.058 28.352C36.786 28.924 37.2367 29.3487 37.41 29.626C37.462 29.6953 37.4447 29.7733 37.358 29.86C37.15 30.068 36.8553 30.198 36.474 30.25V39.974H37.28L38.06 38.7C38.1467 38.5787 38.268 38.3967 38.424 38.154C38.58 37.9113 38.7013 37.7293 38.788 37.608C38.892 37.4867 38.9787 37.426 39.048 37.426C39.1867 37.426 39.646 37.8073 40.426 38.57C41.206 39.3153 41.674 39.844 41.83 40.156C41.882 40.2427 41.882 40.3293 41.83 40.416C41.726 40.6067 41.5007 40.702 41.154 40.702H22.616C21.5067 40.7193 20.2673 40.832 18.898 41.04H18.82C18.7507 41.04 18.69 40.9967 18.638 40.91L18.17 40.026C18.1527 40.0087 18.144 39.974 18.144 39.922C18.144 39.8353 18.2133 39.792 18.352 39.792C19.288 39.8787 20.3367 39.9393 21.498 39.974H23.552C24.228 37.27 24.982 33.8813 25.814 29.808H24.228C23.344 29.8253 22.4687 29.9293 21.602 30.12C21.4633 30.1547 21.3767 30.12 21.342 30.016L20.874 29.132C20.8567 29.1147 20.848 29.08 20.848 29.028C20.848 28.9413 20.9173 28.898 21.056 28.898C21.992 28.9847 23.0407 29.0453 24.202 29.08H25.944C26.3947 26.9653 26.8367 24.6167 27.27 22.034H24.124C23.0147 22.0513 21.7753 22.164 20.406 22.372H20.328C20.2587 22.372 20.198 22.3287 20.146 22.242L19.678 21.332C19.6607 21.3147 19.652 21.28 19.652 21.228C19.652 21.1413 19.7127 21.098 19.834 21.098C20.7873 21.1847 21.8447 21.2453 23.006 21.28H35.616L36.396 20.084C36.4653 19.98 36.578 19.8153 36.734 19.59C36.89 19.3473 37.02 19.174 37.124 19.07C37.228 18.9487 37.3147 18.888 37.384 18.888C37.54 18.888 38.0253 19.252 38.84 19.98C39.672 20.6907 40.166 21.1933 40.322 21.488C40.374 21.5747 40.374 21.6613 40.322 21.748C40.218 21.9387 40.0013 22.034 39.672 22.034H30.364C30.0173 23.9753 29.5753 26.324 29.038 29.08H33.224L33.9 28.274ZM33.458 39.974V29.808H28.882C28.0153 33.968 27.2613 37.3567 26.62 39.974H33.458Z" fill="white" />
    </svg>,
    6: <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M59.9947 29.9973C59.9947 21.8347 54.1121 15.0494 46.3505 13.64C44.9466 5.88309 38.1619 0 29.9947 0C21.8274 0 15.048 5.88309 13.6388 13.6453C5.88256 15.0494 0 21.8347 0 29.9973C0 38.16 5.88256 44.9453 13.6441 46.3547C15.0534 54.1116 21.8381 60 30 60C38.1619 60 44.9466 54.1169 46.3559 46.3547C54.1121 44.9453 60 38.16 60 29.9973H59.9947Z" fill="#38542A" />
      <path d="M37.41 23.308C37.4793 23.204 37.6007 23.048 37.774 22.84C37.9473 22.6147 38.086 22.45 38.19 22.346C38.294 22.2247 38.3807 22.164 38.45 22.164C38.606 22.164 39.1 22.5107 39.932 23.204C40.7813 23.88 41.2927 24.3653 41.466 24.66C41.518 24.7467 41.518 24.8333 41.466 24.92C41.362 25.1107 41.1453 25.206 40.816 25.206H23.058C21.9487 25.2233 20.7093 25.336 19.34 25.544H19.262C19.1927 25.544 19.132 25.5007 19.08 25.414L18.612 24.504C18.5947 24.4867 18.586 24.452 18.586 24.4C18.586 24.3133 18.6467 24.27 18.768 24.27C19.7213 24.3567 20.7787 24.4173 21.94 24.452H28.44V23.594C28.44 21.618 28.336 19.928 28.128 18.524C28.128 18.3507 28.206 18.2813 28.362 18.316C29.8007 18.6107 30.7887 18.8447 31.326 19.018C31.8633 19.1913 32.132 19.3387 32.132 19.46C32.132 19.512 32.0627 19.59 31.924 19.694L31.482 19.98V24.452H36.578L37.41 23.308ZM24.904 28.3C24.9213 28.2307 24.9473 28.1873 24.982 28.17C25.034 28.1353 25.0947 28.1353 25.164 28.17L27.192 29.132C28.336 29.548 28.908 29.8513 28.908 30.042C28.908 30.1287 28.8127 30.198 28.622 30.25L28.102 30.38C27.01 32.8933 25.6667 35.0167 24.072 36.75C22.4773 38.466 20.64 39.8787 18.56 40.988C18.456 41.04 18.3607 41.0227 18.274 40.936C18.1873 40.832 18.1873 40.7367 18.274 40.65C19.1927 39.7487 20.0767 38.7 20.926 37.504C21.7753 36.2907 22.5467 34.9907 23.24 33.604C23.604 32.876 23.9507 31.992 24.28 30.952C24.6093 29.912 24.8173 29.028 24.904 28.3ZM32.392 29.08C32.288 28.976 32.288 28.8893 32.392 28.82C32.4787 28.768 32.574 28.768 32.678 28.82C34.6713 29.756 36.3093 30.796 37.592 31.94C38.8747 33.0667 39.7933 34.1847 40.348 35.294C40.92 36.386 41.206 37.3827 41.206 38.284C41.206 38.96 41.0587 39.506 40.764 39.922C40.4693 40.3207 40.0967 40.52 39.646 40.52C39.23 40.52 38.788 40.3467 38.32 40C38.2507 39.9307 38.2073 39.8527 38.19 39.766C37.8607 38.0327 37.15 36.1953 36.058 34.254C34.9833 32.3127 33.7613 30.588 32.392 29.08Z" fill="white" />
    </svg>
  };

  return (
    <main className={`min-h-screen bg-[#f6f4ee] text-[#2b3a2e] py-6 px-4 ${shipporimincho.className}`}>
      <div className="mx-auto w-full max-w-[980px]">
        {/* Progress / Accuracy and Step Header (hidden on completion) */}
        {answeredCount !== 6 && (
          <>
            <div className="mb-4 bg-transparent">
              <div className="mb-2 flex items-center justify-between">

                <span className="text-lg font-extrabold text-[#38542A]">
                  <span className="mb-2 text-sm pr-4 text-[#385243]">Step {currentStep} / {totalSteps}</span>
                  {accuracy}%
                </span>
                <span className="font-bold text-[#38542A] text-righ">見積もり精度</span>
              </div>
              <div className="mb-2 grid grid-cols-6">
                {steps.map((done, i) => (
                  <div key={i} className={`h-2  ${done ? "bg-[#38542A]" : "bg-[#DADFD6]"}`} />
                ))}
              </div>
              {/* <p className="text-sm text-[#385243]">
                回答が進むほど金額の幅が狭まり、精度が上がります。
              </p> */}
            </div>
            <div className=" flex items-center justify-start mb-[10px]">
              <span className="pr-5">
                {IconSvgMap[currentStep]}
              </span>

              <h1 className="bg-transparent text-[26px] font-bold tracking-wide">
                {stepTitles[currentStep - 1]}
              </h1>
            </div>

            <div className="overflow-hidden bg-transparent">
              <Image
                alt="ステップ用イメージ"
                src={stepImageMap[currentStep]}
                className="block h-[300px] w-full object-cover md:h-[420px]"
              />
            </div>
          </>
        )}


        {/* Wizard (one question per step) */}
        {answeredCount === 6 ? (
          // Final Estimate Result Card (matching attached design)
          <section className="mt-6">
            <div className="border-2 border-[#38542A] bg-transparent p-8 text-center">
              <div className="flex gap-10 flex-wrap">
                <div className="w-[503px]">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#38542A] mb-2">あなたの畳の最終見積もり結果</h2>
                  <div className="text-[#385243] mb-4">ご回答いただいた内容から専用の見積もりを作成しました。</div>
                  <div className="border-2 border-[#38542A] py-8 px-4 my-6 max-w-xl mx-auto">
                    <div className="text-lg text-[#385243] mb-2">最終見積額</div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[#38542A] mb-2">
                      {roundedRange ? `${roundedRange.low.toLocaleString()}~${roundedRange.high.toLocaleString()}円` : "-"}
                    </div>
                  </div>
                  <div className="text-sm text-[#385243] mb-6">※この見積もりは概算です。正確な金額は現地確認後に決定します。</div>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold text-[#38542A] mb-2">選択された条件</h3>
                  <ul className="text-[#385243] text-sm list-disc pl-5">
                    <li>お部屋タイプ：{roomType === "detached" ? "一戸建ての和室" : roomType === "mansion" ? "マンションの和室" : roomType === "living" ? "リビング・洋室" : "その他"}</li>
                    <li>畳の広さ：{sizeKey === "small" ? "4.5畳以下" : sizeKey === "six" ? "6畳" : sizeKey === "eightPlus" ? "8畳以上" : `${customTatami}畳`}</li>
                    <li>施工内容：{work === "replace" ? "既存畳の張り替え" : work === "new" ? "新規導入" : work === "okidatami" ? "置き畳" : "相談"}</li>
                    <li>用途：{usage === "daily" ? "普段の生活" : usage === "kids" ? "子ども部屋" : usage === "pets" ? "ペットがいる部屋" : usage === "care" ? "介護・お風呂用" : "-"}</li>
                    <li>重視ポイント：{priority === "cost" ? "コスト" : priority === "health" ? "抗菌・防カビ・防ダニ" : priority === "durability" ? "耐久性" : priority === "design" ? "デザイン" : "-"}</li>
                    <li>畳スタイル：{material === "igusa_cn" ? "天然い草（中国産）" : material === "igusa_jp" ? "天然い草（国産）" : material === "resin" ? "樹脂畳" : material === "washi" ? "和紙畳" : "-"}</li>
                    <li>グレード：{grade === "economy" ? "エコノミー" : grade === "standard" ? "スタンダード" : grade === "premium" ? "プレミアム" : grade === "deluxe" ? "デラックス" : "-"}</li>
                  </ul>
                </div>
              </div>
                <div className="text-left mb-8 flex flex-col w-full">
                  <h3 className="text-xl font-bold text-center text-[#38542A] mb-2">さらに正確な見積もりのために</h3>
                  <div className="text-[#385243] text-center text-sm mb-2">現地確認や詳細なお打ち合わせをご希望の方は以下よりご連絡ください。<br />お写真を送っていただくとより正確な見積もりが可能です。</div>
                </div>
              <div className="flex flex-col md:flex-row gap-4 justify-center mt-8">
                <a href="#" className="flex-1 w-[362px] md:flex-none bg-[#38542A] text-white font-bold py-4 rounded flex items-center justify-center text-lg hover:bg-[#254e33] transition">
                  <span className="mr-2">
                    <svg width="35" height="28" viewBox="0 0 35 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_2013_37)">
                        <path d="M1.81619 27.4771C1.21642 26.856 3.7601 22.9474 4.1297 22.1128C4.1297 21.4819 2.95672 20.5387 2.62917 19.976C2.18432 19.2118 0.181388 15.3265 0.0906472 14.7413C-0.860283 8.59713 5.82869 1.47519 11.5903 0.37761C15.9127 -0.445765 25.4773 -0.0599248 28.9498 2.91516C30.8199 4.51771 33.0575 7.59095 33.883 9.94195C34.0512 10.4214 35.011 13.9629 34.9999 14.1847C34.6451 21.2901 26.0446 27.4171 19.425 27.9678C17.321 28.1431 12.2432 27.5775 10.2543 26.8844C9.49151 26.6185 8.86886 25.679 7.86703 25.6812C7.36464 25.682 5.43179 26.605 4.65718 26.8327C3.8206 27.0792 2.69335 27.2733 1.81619 27.4763V27.4771Z" fill="white" />
                      </g>
                      <defs>
                        <clipPath id="clip0_2013_37">
                          <rect width="35" height="28" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>

                  </span>LINEで相談する</a>
                <a href="#" className="flex-1 w-[362px] md:flex-none bg-[#d94d1a] text-white font-bold py-4 rounded flex items-center justify-center text-lg hover:bg-[#b53c0e] transition">
                  <span className="mr-2"><svg width="30" height="29" viewBox="0 0 30 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_2013_26)">
                      <path d="M9.95406 3.94879C8.54837 2.39141 6.73089 -1.79785 4.11148 0.867388L10.8736 7.86689L12.6307 6.22251C12.5626 5.91799 10.4402 4.48677 9.9556 3.95024L9.95406 3.94879ZM5.08989 3.93284C4.67345 3.53842 4.43349 2.75393 3.83746 2.60022C2.03391 2.1304 0.154505 6.99539 0.0322042 8.45272C-0.761977 17.9724 12.8645 31.1217 23.2879 28.7102C23.7477 28.6044 26.9663 27.4661 27.0886 27.3138C27.2403 25.9304 25.6194 25.7709 24.8593 25.1909C24.0357 24.563 21.8544 22.4401 21.1624 22.1516C20.3372 21.8079 19.2489 22.5286 17.8881 22.2023C17.7178 22.1617 15.1882 20.5724 14.9421 20.3941C13.6091 19.4283 8.85644 15.1564 8.44155 13.9209C7.56532 11.3079 9.86891 10.0942 9.61657 9.00084C9.52213 8.59047 5.75867 4.56652 5.08834 3.92994L5.08989 3.93284ZM29.3039 26.1639C29.4711 26.0493 29.7467 24.7414 29.5284 24.2759C29.3767 23.954 24.6038 19.4878 24.2493 19.292C22.7724 18.4742 22.5371 19.337 21.1825 19.6995C21.0803 20.8755 22.6377 20.9639 23.4164 21.5947C24.2896 22.3038 28.4014 26.7787 29.3039 26.1625V26.1639Z" fill="black" />
                      <path d="M5.09086 4.36444C5.76119 4.99957 9.52311 9.02352 9.61909 9.43534C9.87143 10.5287 7.56784 11.7424 8.44407 14.3554C8.85742 15.5909 13.6117 19.8628 14.9446 20.8286C15.1907 21.0069 17.7204 22.5962 17.8907 22.6368C19.2514 22.9631 20.3398 22.2409 21.1649 22.5861C21.8569 22.8746 24.0382 24.9975 24.8618 25.6254C25.6219 26.204 27.2428 26.3649 27.0911 27.7483C26.9672 27.9006 23.7503 29.0374 23.2905 29.1447C12.867 31.5533 -0.761004 18.404 0.0331772 8.88431C0.155478 7.42699 2.03489 2.562 3.83999 3.03182C4.43601 3.18698 4.67597 3.97002 5.09241 4.36444H5.09086Z" fill="white" />
                      <path d="M9.95439 3.94849C10.439 4.48502 12.563 5.91624 12.6295 6.22075L10.8724 7.86514L4.11182 0.867086C6.73122 -1.79815 8.54871 2.39256 9.95594 3.94849H9.95439Z" fill="white" />
                      <path d="M29.3042 26.1637C28.4016 26.7799 24.2898 22.305 23.4167 21.5959C22.6395 20.9652 21.0806 20.8767 21.1828 19.7007C22.5374 19.3382 22.7727 18.4754 24.2496 19.2932C24.6041 19.489 29.3769 23.9552 29.5286 24.2771C29.7469 24.7411 29.4714 26.0506 29.3042 26.1651V26.1637Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="clip0_2013_26">
                        <rect width="29.6092" height="29" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  </span>
                  電話で相談する</a>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 md:grid-cols-4">
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
                    className={` border-2 px-0 text-center py-3 text-left font-bold shadow-sm transition-colors ${roomType !== key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    {/* <div className="text-xs opacity-80">{sub}</div> */}
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
                      { key: "small", label: "4畳半以下", sub: "係数1.20 / 4.5畳" },
                      { key: "six", label: "6畳", sub: "係数1.00 / 6畳" },
                      { key: "eightPlus", label: "8畳以上", sub: "係数0.95 / 8畳" },
                      { key: "custom", label: "わからない・入力する", sub: "畳数を入力" },
                    ] as { key: SizeKey; label: string; sub: string }[]
                  ).map(({ key, label, sub }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSizeKey(key);
                        if (key !== "custom") setCurrentStep((s) => Math.min(totalSteps, s + 1));
                      }}
                      className={`border-2 py-3 text-center font-bold ${key === "custom" && 'text-[15px]'} shadow-sm transition-colors ${sizeKey !== key
                        ? "border-[#38542A] bg-[#38542A] text-white"
                        : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                        }`}
                    >
                      <div>{label}</div>
                      {/* <div className="text-xs opacity-80">{sub}</div> */}
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
                    { key: "replace", label: "張り替え", sub: "係数1.00" },
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
                    className={`border-2 py-3 text-center font-bold ${key !== 'replace' && 'text-[15px]'} shadow-sm transition-colors ${work !== key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    {/* <div className="text-xs opacity-80">{sub}</div> */}
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
                    className={`border-2 py-3 text-center font-bold shadow-sm transition-colors ${usage !== key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    {/* <div className="text-xs opacity-80">{sub}</div> */}
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
                    className={`border-2 py-3 text-center font-bold shadow-sm transition-colors ${priority !== key
                      ? "border-[#38542A] bg-[#38542A] text-white"
                      : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                      }`}
                  >
                    <div>{label}</div>
                    {/* <div className="text-xs opacity-80">{sub}</div> */}
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
                      className={`border-2 py-3 text-center font-bold shadow-sm transition-colors ${material !== key
                        ? "border-[#38542A] bg-[#38542A] text-white"
                        : "border-[#38542A] bg-white text-[#2b3a2e] hover:bg-[#eff3ee]"
                        }`}
                    >
                      <div>{label}</div>
                      {/* <div className="text-xs opacity-80">{sub}</div> */}
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
        )}

        {/* Estimate Card (hidden on completion) */}
        {answeredCount !== 6 && (
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
        )}
      </div>
    </main>
  );
}
