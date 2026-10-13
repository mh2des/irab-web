/**
 * Whether «اسأل الأستاذ» shows on the website. Off until the owner launches
 * it; `?teacher=1` turns a preview on in this browser (`?teacher=0` off), so
 * it can be tried on irab.app before launch.
 */
export const TEACHER_WEB = false;

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
