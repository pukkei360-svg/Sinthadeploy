/**
 * Manipuri + Indian Festival Calendar for SINTHA
 *
 * Returns the current/upcoming festival based on the date.
 * Used by FestivalBanner to show themed banners on the Home screen.
 *
 * Festivals are grouped by month. Each festival has:
 * - name, emoji, theme colors, description, suggested services
 * - date detection: either fixed (month + day) or approximate date range
 */

export interface Festival {
  id: string
  name: string
  emoji: string
  message: string
  subtitle: string
  gradient: string // CSS gradient for the banner background
  iconColor: string
  jobTemplates: string[] // quick-fill templates for PostJobScreen
  startMonth: number // 0-11 (Jan=0)
  startDay: number
  endDay: number // for multi-day festivals
}

// 2026 festival dates (approximate — some vary by lunar calendar)
const FESTIVALS: Festival[] = [
  {
    id: 'new-year',
    name: 'Happy New Year',
    emoji: '🎉',
    message: 'New Year, New Services!',
    subtitle: 'Start 2026 right — find trusted providers for any need',
    gradient: 'from-purple-600 to-pink-600',
    iconColor: 'text-yellow-300',
    jobTemplates: [
      'Need home cleaning for New Year',
      'Need a photographer for New Year party',
      'Need transport for New Year celebration',
    ],
    startMonth: 0, // January
    startDay: 1,
    endDay: 3,
  },
  {
    id: 'imoinu-iratpa',
    name: 'Imoinu Iratpa',
    emoji: '🪔',
    message: 'Goddess Imoinu bless your home',
    subtitle: 'Find cooks & decorators for Imoinu Iratpa offerings',
    gradient: 'from-amber-600 to-orange-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need a cook for Imoinu Iratpa feast',
      'Need decoration for Imoinu Iratpa at home',
      'Need flowers and items for Imoinu Iratpa',
    ],
    startMonth: 0, // January
    startDay: 10,
    endDay: 14,
  },
  {
    id: 'gaan-ngai',
    name: 'Gaan-Ngai',
    emoji: '🥁',
    message: 'Post-Harvest Celebration!',
    subtitle: 'Traditional dance, feast & games — find event services',
    gradient: 'from-red-700 to-amber-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need catering for Gaan-Ngai feast',
      'Need sound system for Gaan-Ngai celebration',
      'Need traditional dress tailor',
    ],
    startMonth: 0, // January
    startDay: 15,
    endDay: 20,
  },
  {
    id: 'lui-ngai-ni',
    name: 'Lui-Ngai-Ni',
    emoji: '🌱',
    message: 'Seed Sowing Festival',
    subtitle: 'Cultural dances & traditional attire — book event services',
    gradient: 'from-green-700 to-lime-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need traditional dress for Lui-Ngai-Ni',
      'Need transport for Lui-Ngai-Ni event',
      'Need photographer for Lui-Ngai-Ni celebration',
    ],
    startMonth: 1, // February
    startDay: 13,
    endDay: 16,
  },
  {
    id: 'sajibu-cheiraoba',
    name: 'Sajibu Cheiraoba',
    emoji: '🏔️',
    message: 'Meitei New Year',
    subtitle: 'Clean home, climb hills, share feast — find cooks & cleaners',
    gradient: 'from-blue-700 to-cyan-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need deep cleaning for Sajibu Cheiraoba',
      'Need a cook for Cheiraoba special feast',
      'Need transport for hill climbing trip',
    ],
    startMonth: 3, // April
    startDay: 8,
    endDay: 12,
  },
  {
    id: 'yaoshang',
    name: 'Yaoshang',
    emoji: '🌈',
    message: 'Festival of Colors & Sports!',
    subtitle: 'Thabal Chongba, sports, colors — book event & sound services',
    gradient: 'from-pink-600 via-purple-600 to-blue-600',
    iconColor: 'text-yellow-300',
    jobTemplates: [
      'Need sound system for Thabal Chongba',
      'Need sports equipment for Yaoshang',
      'Need photographer for Yaoshang celebration',
      'Need color powder for Yaoshang',
    ],
    startMonth: 2, // March
    startDay: 10,
    endDay: 16,
  },
  {
    id: 'rath-yatra',
    name: 'Rath Yatra',
    emoji: '🛕',
    message: 'Lord Jagannath Chariot Festival',
    subtitle: 'Book decorators, cooks & event setup for Rath Yatra',
    gradient: 'from-orange-600 to-red-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need decoration for Rath Yatra',
      'Need a cook for Rath Yatra prasad',
      'Need event setup for Rath Yatra celebration',
    ],
    startMonth: 6, // July
    startDay: 5,
    endDay: 10,
  },
  {
    id: 'heikru-hitongba',
    name: 'Heikru Hitongba',
    emoji: '🚣',
    message: 'Annual Boat Race!',
    subtitle: 'Moirang boat race — book transport, photographers & food',
    gradient: 'from-cyan-700 to-blue-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need transport to Heikru Hitongba at Moirang',
      'Need photographer for boat race event',
      'Need catering for Heikru Hitongba group',
    ],
    startMonth: 8, // September
    startDay: 20,
    endDay: 25,
  },
  {
    id: 'mera-houchongba',
    name: 'Mera Houchongba',
    emoji: '🤝',
    message: 'Hills & Valley Unity!',
    subtitle: 'Cultural exchange & feast — find event & catering services',
    gradient: 'from-emerald-700 to-teal-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need catering for Mera Houchongba feast',
      'Need traditional decoration for Mera Houchongba',
      'Need transport for Mera Houchongba event',
    ],
    startMonth: 9, // October
    startDay: 15,
    endDay: 20,
  },
  {
    id: 'durga-puja',
    name: 'Durga Puja',
    emoji: '🙇',
    message: 'Divine Decorations & Lights!',
    subtitle: 'Pandal setup, lighting, decorators & community feast cooks',
    gradient: 'from-red-700 via-orange-700 to-amber-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need decorator for Durga Puja pandal',
      'Need electrician for Durga Puja lighting',
      'Need a cook for Durga Puja community feast',
      'Need sound system for Durga Puja cultural program',
    ],
    startMonth: 9, // October
    startDay: 8,
    endDay: 13,
  },
  {
    id: 'diwali',
    name: 'Diwali',
    emoji: '🪔',
    message: 'Festival of Lights!',
    subtitle: 'Decorators, electricians, sweet makers & gift delivery',
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    iconColor: 'text-yellow-300',
    jobTemplates: [
      'Need electrician for Diwali lighting',
      'Need decoration for Diwali at home',
      'Need sweet maker for Diwali',
      'Need gift wrapping & delivery for Diwali',
    ],
    startMonth: 10, // November
    startDay: 1,
    endDay: 5,
  },
  {
    id: 'ningol-chakouba',
    name: 'Ningol Chakouba',
    emoji: '🍽️',
    message: 'Daughters Home for Feast!',
    subtitle: 'Cooks, caterers, gift delivery & transport for the grand feast',
    gradient: 'from-rose-700 to-pink-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need a cook for Ningol Chakouba feast (family of 15)',
      'Need caterer for Ningol Chakouba (large group)',
      'Need gift delivery for Ningol Chakouba',
      'Need transport for Ningol Chakouba family',
    ],
    startMonth: 10, // November
    startDay: 5,
    endDay: 10,
  },
  {
    id: 'sangai',
    name: 'Sangai Festival',
    emoji: '🦌',
    message: 'Manipur\'s Biggest Festival!',
    subtitle: '10-day cultural extravaganza — tour guides, transport, food, photos',
    gradient: 'from-emerald-600 via-green-700 to-teal-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need tour guide for Sangai Festival',
      'Need transport for Sangai Festival visit',
      'Need photographer for Sangai Festival',
      'Need food stall setup for Sangai Festival',
      'Need decoration for Sangai Festival stall',
    ],
    startMonth: 10, // November
    startDay: 21,
    endDay: 30,
  },
  {
    id: 'kut',
    name: 'Kut Festival',
    emoji: '🌾',
    message: 'Post-Harvest Celebration!',
    subtitle: 'Cultural dances, music & feast — book event services',
    gradient: 'from-amber-700 to-yellow-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need catering for Kut Festival feast',
      'Need sound system for Kut Festival',
      'Need traditional dress for Kut Festival',
    ],
    startMonth: 10, // November
    startDay: 1,
    endDay: 3,
  },
  {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    message: 'Joyful Celebrations!',
    subtitle: 'Decorators, bakers, gift wrapping & event setup',
    gradient: 'from-red-700 via-green-700 to-red-700',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need decoration for Christmas at home',
      'Need a cake baker for Christmas',
      'Need gift wrapping service for Christmas',
      'Need event setup for Christmas party',
      'Need a cook for Christmas feast',
    ],
    startMonth: 11, // December
    startDay: 20,
    endDay: 27,
  },
  {
    id: 'new-year-eve',
    name: "New Year's Eve",
    emoji: '🎆',
    message: 'Ring in 2027!',
    subtitle: 'Photographers, decorators, transport & event setup',
    gradient: 'from-indigo-700 via-purple-700 to-pink-700',
    iconColor: 'text-yellow-300',
    jobTemplates: [
      'Need photographer for New Year party',
      'Need decoration for New Year Eve party',
      'Need transport for New Year celebration',
      'Need DJ / sound system for New Year party',
    ],
    startMonth: 11, // December
    startDay: 29,
    endDay: 31,
  },
  {
    id: 'easter',
    name: 'Easter',
    emoji: '🐣',
    message: 'He is Risen!',
    subtitle: 'Bakers, decorators & event setup for Easter celebration',
    gradient: 'from-purple-600 to-pink-600',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need a cake baker for Easter',
      'Need decoration for Easter celebration',
      'Need event setup for Easter party',
    ],
    startMonth: 3, // April
    startDay: 3,
    endDay: 6,
  },
  {
    id: 'eid',
    name: 'Eid Mubarak',
    emoji: '🌙',
    message: 'Eid Mubarak!',
    subtitle: 'Cooks, caterers, decorators & gift delivery for Eid feast',
    gradient: 'from-green-700 to-emerald-800',
    iconColor: 'text-yellow-200',
    jobTemplates: [
      'Need a cook for Eid feast',
      'Need caterer for Eid celebration (large group)',
      'Need decoration for Eid at home',
      'Need gift delivery for Eid',
    ],
    startMonth: 2, // March (approximate — varies by lunar calendar)
    startDay: 18,
    endDay: 22,
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    emoji: '🇮🇳',
    message: 'Happy Independence Day!',
    subtitle: 'Flag hoisting setup, decorators, photographers & catering',
    gradient: 'from-orange-600 via-white to-green-700',
    iconColor: 'text-blue-800',
    jobTemplates: [
      'Need decoration for Independence Day event',
      'Need photographer for Independence Day function',
      'Need catering for Independence Day celebration',
    ],
    startMonth: 7, // August
    startDay: 13,
    endDay: 16,
  },
  {
    id: 'republic-day',
    name: 'Republic Day',
    emoji: '🇮🇳',
    message: 'Happy Republic Day!',
    subtitle: 'Event setup, decorators, photographers & parade transport',
    gradient: 'from-orange-600 via-white to-green-700',
    iconColor: 'text-blue-800',
    jobTemplates: [
      'Need decoration for Republic Day event',
      'Need photographer for Republic Day function',
      'Need transport for Republic Day parade',
    ],
    startMonth: 0, // January
    startDay: 24,
    endDay: 27,
  },
]

/**
 * Get the current active festival based on today's date.
 * Returns the festival if today falls within its date range,
 * or the NEXT upcoming festival within 7 days.
 * Returns null if no festival is active or upcoming soon.
 */
export function getCurrentFestival(): Festival | null {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11
  const currentDay = now.getDate()

  // First check: is there a festival happening RIGHT NOW?
  const active = FESTIVALS.find(
    (f) => f.startMonth === currentMonth && currentDay >= f.startDay && currentDay <= f.endDay
  )
  if (active) return active

  // Second check: is there a festival starting within the next 7 days?
  // (Only check same month + next month)
  for (const f of FESTIVALS) {
    if (f.startMonth === currentMonth && f.startDay - currentDay > 0 && f.startDay - currentDay <= 7) {
      return f // Upcoming within 7 days
    }
    // Check next month's early festivals (if we're in the last week of the month)
    const nextMonth = (currentMonth + 1) % 12
    if (f.startMonth === nextMonth && f.startDay <= 7 && currentDay >= 24) {
      return f
    }
  }

  return null
}

/**
 * Get festival job templates for the PostJobScreen.
 * Returns the templates array of the current festival, or null if no festival.
 */
export function getFestivalJobTemplates(): string[] | null {
  const festival = getCurrentFestival()
  return festival?.jobTemplates || null
}

/**
 * Get all festivals (for admin/debug purposes).
 */
export function getAllFestivals(): Festival[] {
  return FESTIVALS
}
