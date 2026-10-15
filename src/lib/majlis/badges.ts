/**
 * The five majlis badges as players and the stage see them. The server
 * decides who earns them (functions-majalis/src/majalis/badges.ts) and
 * writes rooms/{id}/awards when the majlis ends.
 */
export type BadgeId = 'sibawayh' | 'knight' | 'eye' | 'steady' | 'climber';
export interface Award { id: BadgeId; uid: string; name: string; avatar: number; value?: number }

export const BADGES: Record<BadgeId, { title: string; rule: string; img: string }> = {
  sibawayh: { title: 'سيبويه المجلس', rule: 'المركز الأول', img: 'crown' },
  knight: { title: 'الفارس النحوي', rule: 'ضمن الثلاثة الأوائل', img: 'trophy' },
  eye: { title: 'عين النحاة', rule: 'أسرع إجابة صحيحة', img: 'high-voltage' },
  steady: { title: 'ثابت الإعراب', rule: 'كل الإجابات صحيحة', img: 'bullseye' },
  climber: { title: 'صاعد المجلس', rule: 'أكبر تقدم في الترتيب', img: 'rocket' },
};

/** Awards from RTDB (an object keyed `${id}_${uid}`), in badge order. */
export function readAwards(raw: unknown): Award[] {
  const order: BadgeId[] = ['sibawayh', 'knight', 'eye', 'steady', 'climber'];
  const list = Object.values((raw ?? {}) as Record<string, Award>).filter((a) => a && a.id in BADGES);
  return list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
