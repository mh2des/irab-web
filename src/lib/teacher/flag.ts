/**
 * Whether «اسأل الأستاذ» shows on the website: on for everyone since the
 * owner launched it (2026-10-13). With TEACHER_WEB false, `?teacher=1` turns
 * a preview on in one browser (`?teacher=0` off).
 */
export const TEACHER_WEB = true;

export function teacherEnabled(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('teacher');
    if (q === '1') localStorage.setItem('irab-teacher-preview', '1');
    if (q === '0') localStorage.removeItem('irab-teacher-preview');
    return TEACHER_WEB || localStorage.getItem('irab-teacher-preview') === '1';
  } catch {
    return TEACHER_WEB;
  }
}
