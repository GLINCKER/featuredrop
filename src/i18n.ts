export interface FeatureDropTranslations {
  newBadge: string;
  whatsNewTitle: string;
  markAllRead: string;
  allCaughtUp: string;
  close: string;
  changelogTitle: string;
  searchPlaceholder: string;
  allCategories: string;
  noUpdatesYet: string;
  loadMore: string;
  share: string;
  skipToEntries: string;
  newFeatureCount: (count: number) => string;
  stepOf: (current: number, total: number) => string;
  back: string;
  next: string;
  skip: string;
  finish: string;
  gotIt: string;
  announcement: string;
  feedbackTitle: string;
  feedbackTrigger: string;
  feedbackSubmitted: string;
  submit: string;
  cancel: string;
  askLater: string;
}

const EN_TRANSLATIONS: FeatureDropTranslations = {
  newBadge: "New",
  whatsNewTitle: "What's New",
  markAllRead: "Mark all as read",
  allCaughtUp: "You're all caught up!",
  close: "Close",
  changelogTitle: "Changelog",
  searchPlaceholder: "Search updates",
  allCategories: "All categories",
  noUpdatesYet: "No updates yet",
  loadMore: "Load more",
  share: "Share",
  skipToEntries: "Skip to changelog entries",
  newFeatureCount: (count: number) =>
    count === 0 ? "No new features" : `${count} new feature${count === 1 ? "" : "s"}`,
  stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  back: "Back",
  next: "Next",
  skip: "Skip",
  finish: "Finish",
  gotIt: "Got it",
  announcement: "Announcement",
  feedbackTitle: "Share feedback",
  feedbackTrigger: "Feedback",
  feedbackSubmitted: "Thanks for the feedback.",
  submit: "Submit",
  cancel: "Cancel",
  askLater: "Ask me later",
};

const SIMPLE_TRANSLATIONS: Record<string, Partial<FeatureDropTranslations>> = {
  es: {
    newBadge: "Nuevo",
    whatsNewTitle: "Novedades",
    markAllRead: "Marcar todo como leído",
    allCaughtUp: "Estás al día.",
    close: "Cerrar",
    changelogTitle: "Registro de cambios",
    searchPlaceholder: "Buscar actualizaciones",
    allCategories: "Todas las categorías",
    noUpdatesYet: "Aún no hay actualizaciones",
    loadMore: "Cargar más",
    share: "Compartir",
    skipToEntries: "Saltar a las entradas del changelog",
    back: "Atrás",
    next: "Siguiente",
    skip: "Saltar",
    finish: "Finalizar",
    gotIt: "Entendido",
    announcement: "Anuncio",
    feedbackTitle: "Enviar comentarios",
    feedbackTrigger: "Comentarios",
    feedbackSubmitted: "Gracias por tus comentarios.",
    submit: "Enviar",
    cancel: "Cancelar",
    askLater: "Preguntar más tarde",
  },
  fr: {
    newBadge: "Nouveau",
    whatsNewTitle: "Nouveautés",
    markAllRead: "Tout marquer comme lu",
    allCaughtUp: "Vous êtes à jour.",
    close: "Fermer",
    changelogTitle: "Journal des changements",
    searchPlaceholder: "Rechercher des mises à jour",
    allCategories: "Toutes les catégories",
    noUpdatesYet: "Aucune mise à jour",
    loadMore: "Charger plus",
    share: "Partager",
    skipToEntries: "Aller aux entrées du changelog",
    back: "Retour",
    next: "Suivant",
    skip: "Passer",
    finish: "Terminer",
    gotIt: "Compris",
    announcement: "Annonce",
    feedbackTitle: "Partager un avis",
    feedbackTrigger: "Avis",
    feedbackSubmitted: "Merci pour votre avis.",
    submit: "Envoyer",
    cancel: "Annuler",
    askLater: "Demander plus tard",
  },
  de: {
    newBadge: "Neu",
    whatsNewTitle: "Neuigkeiten",
    markAllRead: "Alles als gelesen markieren",
    allCaughtUp: "Alles erledigt.",
    close: "Schließen",
    changelogTitle: "Änderungsprotokoll",
    searchPlaceholder: "Updates suchen",
    allCategories: "Alle Kategorien",
    noUpdatesYet: "Noch keine Updates",
    loadMore: "Mehr laden",
    share: "Teilen",
    skipToEntries: "Zu den Einträgen springen",
    back: "Zurück",
    next: "Weiter",
    skip: "Überspringen",
    finish: "Fertig",
    gotIt: "Verstanden",
    announcement: "Ankündigung",
    feedbackTitle: "Feedback teilen",
    feedbackTrigger: "Feedback",
    feedbackSubmitted: "Danke für dein Feedback.",
    submit: "Senden",
    cancel: "Abbrechen",
    askLater: "Später fragen",
  },
  pt: {
    newBadge: "Novo",
    whatsNewTitle: "Novidades",
    markAllRead: "Marcar tudo como lido",
    allCaughtUp: "Tudo em dia.",
    close: "Fechar",
    changelogTitle: "Histórico de mudanças",
    searchPlaceholder: "Buscar atualizações",
    allCategories: "Todas as categorias",
    noUpdatesYet: "Sem atualizações ainda",
    loadMore: "Carregar mais",
    share: "Compartilhar",
    skipToEntries: "Ir para entradas do changelog",
    back: "Voltar",
    next: "Próximo",
    skip: "Pular",
    finish: "Concluir",
    gotIt: "Entendi",
    announcement: "Anúncio",
    feedbackTitle: "Enviar feedback",
    feedbackTrigger: "Feedback",
    feedbackSubmitted: "Obrigado pelo feedback.",
    submit: "Enviar",
    cancel: "Cancelar",
    askLater: "Perguntar depois",
  },
  "zh-cn": {
    newBadge: "新",
    whatsNewTitle: "最新动态",
    markAllRead: "全部标记为已读",
    allCaughtUp: "你已查看全部更新。",
    close: "关闭",
    changelogTitle: "更新日志",
    searchPlaceholder: "搜索更新",
    allCategories: "全部分类",
    noUpdatesYet: "暂无更新",
    loadMore: "加载更多",
    share: "分享",
    skipToEntries: "跳转到更新条目",
    back: "返回",
    next: "下一步",
    skip: "跳过",
    finish: "完成",
    gotIt: "知道了",
    announcement: "公告",
    feedbackTitle: "提交反馈",
    feedbackTrigger: "反馈",
    feedbackSubmitted: "感谢你的反馈。",
    submit: "提交",
    cancel: "取消",
    askLater: "稍后询问",
  },
  ja: {
    newBadge: "新着",
    whatsNewTitle: "新機能",
    markAllRead: "すべて既読にする",
    allCaughtUp: "すべて確認済みです。",
    close: "閉じる",
    changelogTitle: "変更履歴",
    searchPlaceholder: "更新を検索",
    allCategories: "すべてのカテゴリ",
    noUpdatesYet: "更新はありません",
    loadMore: "さらに表示",
    share: "共有",
    skipToEntries: "変更履歴へ移動",
    back: "戻る",
    next: "次へ",
    skip: "スキップ",
    finish: "完了",
    gotIt: "了解",
    announcement: "お知らせ",
    feedbackTitle: "フィードバックを送信",
    feedbackTrigger: "フィードバック",
    feedbackSubmitted: "フィードバックありがとうございます。",
    submit: "送信",
    cancel: "キャンセル",
    askLater: "後で聞く",
  },
  ko: {
    newBadge: "새로움",
    whatsNewTitle: "새 소식",
    markAllRead: "모두 읽음 처리",
    allCaughtUp: "모든 업데이트를 확인했습니다.",
    close: "닫기",
    changelogTitle: "변경 로그",
    searchPlaceholder: "업데이트 검색",
    allCategories: "전체 카테고리",
    noUpdatesYet: "업데이트가 없습니다",
    loadMore: "더 보기",
    share: "공유",
    skipToEntries: "변경 항목으로 이동",
    back: "뒤로",
    next: "다음",
    skip: "건너뛰기",
    finish: "완료",
    gotIt: "확인",
    announcement: "공지",
    feedbackTitle: "피드백 보내기",
    feedbackTrigger: "피드백",
    feedbackSubmitted: "피드백 감사합니다.",
    submit: "제출",
    cancel: "취소",
    askLater: "나중에 묻기",
  },
  ar: {
    newBadge: "جديد",
    whatsNewTitle: "ما الجديد",
    markAllRead: "تحديد الكل كمقروء",
    allCaughtUp: "تمت متابعة كل التحديثات.",
    close: "إغلاق",
    changelogTitle: "سجل التغييرات",
    searchPlaceholder: "ابحث في التحديثات",
    allCategories: "كل الفئات",
    noUpdatesYet: "لا توجد تحديثات بعد",
    loadMore: "تحميل المزيد",
    share: "مشاركة",
    skipToEntries: "تخطي إلى عناصر السجل",
    back: "رجوع",
    next: "التالي",
    skip: "تخطي",
    finish: "إنهاء",
    gotIt: "تم",
    announcement: "إعلان",
    feedbackTitle: "شارك ملاحظاتك",
    feedbackTrigger: "ملاحظات",
    feedbackSubmitted: "شكرًا على ملاحظاتك.",
    submit: "إرسال",
    cancel: "إلغاء",
    askLater: "اسألني لاحقًا",
  },
  hi: {
    newBadge: "नया",
    whatsNewTitle: "नया क्या है",
    markAllRead: "सभी को पढ़ा हुआ चिह्नित करें",
    allCaughtUp: "आपने सभी अपडेट देख लिए हैं।",
    close: "बंद करें",
    changelogTitle: "परिवर्तन सूची",
    searchPlaceholder: "अपडेट खोजें",
    allCategories: "सभी श्रेणियां",
    noUpdatesYet: "अभी कोई अपडेट नहीं",
    loadMore: "और लोड करें",
    share: "साझा करें",
    skipToEntries: "चेंजलॉग प्रविष्टियों पर जाएं",
    back: "वापस",
    next: "अगला",
    skip: "छोड़ें",
    finish: "समाप्त",
    gotIt: "ठीक है",
    announcement: "घोषणा",
    feedbackTitle: "फीडबैक साझा करें",
    feedbackTrigger: "फीडबैक",
    feedbackSubmitted: "फीडबैक के लिए धन्यवाद।",
    submit: "जमा करें",
    cancel: "रद्द करें",
    askLater: "बाद में पूछें",
  },
};

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

const STEP_OF_TRANSLATIONS: Record<string, (current: number, total: number) => string> = {
  en: EN_TRANSLATIONS.stepOf,
  es: (current: number, total: number) => `Paso ${current} de ${total}`,
  fr: (current: number, total: number) => `Etape ${current} sur ${total}`,
  de: (current: number, total: number) => `Schritt ${current} von ${total}`,
  pt: (current: number, total: number) => `Etapa ${current} de ${total}`,
  "zh-cn": (current: number, total: number) => `第 ${current} / ${total} 步`,
  ja: (current: number, total: number) => `${total}中${current}番目`,
  ko: (current: number, total: number) => `${total}단계 중 ${current}단계`,
  ar: (current: number, total: number) => `الخطوة ${current} من ${total}`,
  hi: (current: number, total: number) => `${total} में से चरण ${current}`,
};

const NEW_FEATURE_COUNT_TRANSLATIONS: Record<string, (count: number) => string> = {
  en: EN_TRANSLATIONS.newFeatureCount,
  es: (count: number) => (count === 0 ? "Sin novedades" : `${count} novedad${count === 1 ? "" : "es"}`),
  fr: (count: number) =>
    count === 0 ? "Aucune nouveaute" : `${count} nouveaute${count === 1 ? "" : "s"}`,
  de: (count: number) =>
    count === 0
      ? "Keine neuen Features"
      : `${count} ${count === 1 ? "neues Feature" : "neue Features"}`,
  pt: (count: number) =>
    count === 0 ? "Sem novidades" : `${count} novidade${count === 1 ? "" : "s"}`,
  "zh-cn": (count: number) => (count === 0 ? "暂无更新" : `${count} 条新更新`),
  ja: (count: number) => (count === 0 ? "新着はありません" : `新着 ${count} 件`),
  ko: (count: number) => (count === 0 ? "새 소식 없음" : `새 소식 ${count}개`),
  ar: (count: number) => {
    if (count === 0) return "لا توجد ميزات جديدة";
    const category = new Intl.PluralRules("ar").select(count);
    if (category === "one") return "ميزة جديدة واحدة";
    if (category === "two") return "ميزتان جديدتان";
    return `${count} ميزات جديدة`;
  },
  hi: (count: number) =>
    count === 0 ? "कोई नया अपडेट नहीं" : `${count} ${count === 1 ? "नया अपडेट" : "नए अपडेट"}`,
};

export function resolveLocale(locale?: string): string {
  const normalized = (locale ?? "en").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (Object.prototype.hasOwnProperty.call(SIMPLE_TRANSLATIONS, normalized)) {
    return normalized;
  }
  const base = normalized.split("-")[0];
  if (base === "en") return "en";
  if (Object.prototype.hasOwnProperty.call(SIMPLE_TRANSLATIONS, base)) {
    return base;
  }
  return "en";
}

export function getLocaleDirection(locale?: string): "ltr" | "rtl" {
  const resolved = resolveLocale(locale);
  const base = resolved.split("-")[0];
  return RTL_LANGUAGES.has(base) ? "rtl" : "ltr";
}

export function formatDateForLocale(
  value: string | number | Date,
  locale?: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const resolved = resolveLocale(locale);
  try {
    return new Intl.DateTimeFormat(resolved, options).format(date);
  } catch {
    return date.toLocaleDateString(undefined, options);
  }
}

export function formatRelativeTimeForLocale(
  value: string | number | Date,
  locale?: string,
  options?: {
    now?: string | number | Date;
    numeric?: Intl.RelativeTimeFormatNumeric;
    style?: Intl.RelativeTimeFormatStyle;
  },
): string {
  const target = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const nowInput = options?.now;
  const nowDate =
    nowInput instanceof Date
      ? nowInput
      : typeof nowInput !== "undefined"
        ? new Date(nowInput)
        : new Date();
  if (Number.isNaN(nowDate.getTime())) return "";

  const diffMs = target.getTime() - nowDate.getTime();
  const absDiff = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let divisor = 1_000;
  if (absDiff >= year) {
    unit = "year";
    divisor = year;
  } else if (absDiff >= month) {
    unit = "month";
    divisor = month;
  } else if (absDiff >= week) {
    unit = "week";
    divisor = week;
  } else if (absDiff >= day) {
    unit = "day";
    divisor = day;
  } else if (absDiff >= hour) {
    unit = "hour";
    divisor = hour;
  } else if (absDiff >= minute) {
    unit = "minute";
    divisor = minute;
  }

  const relativeValue = Math.round(diffMs / divisor);
  const resolvedLocale = resolveLocale(locale);
  try {
    const formatter = new Intl.RelativeTimeFormat(resolvedLocale, {
      numeric: options?.numeric ?? "auto",
      style: options?.style ?? "long",
    });
    return formatter.format(relativeValue, unit);
  } catch {
    const fallback = formatDateForLocale(target, resolvedLocale);
    return fallback || target.toISOString();
  }
}

export function resolveTranslations(
  locale?: string,
  overrides?: Partial<FeatureDropTranslations>,
): FeatureDropTranslations {
  const resolvedLocale = resolveLocale(locale);
  const base = resolvedLocale === "en" ? {} : SIMPLE_TRANSLATIONS[resolvedLocale] ?? {};
  const stepOf =
    overrides?.stepOf ??
    STEP_OF_TRANSLATIONS[resolvedLocale] ??
    STEP_OF_TRANSLATIONS.en;
  const newFeatureCount =
    overrides?.newFeatureCount ??
    NEW_FEATURE_COUNT_TRANSLATIONS[resolvedLocale] ??
    NEW_FEATURE_COUNT_TRANSLATIONS.en;

  return {
    ...EN_TRANSLATIONS,
    ...base,
    ...(overrides ?? {}),
    stepOf,
    newFeatureCount,
  };
}

export const FEATUREDROP_TRANSLATIONS = {
  en: EN_TRANSLATIONS,
  ...SIMPLE_TRANSLATIONS,
} as const;
