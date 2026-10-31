import { hashId } from './mapping.js';

const RU = ['Аня', 'Борис', 'Вера', 'Глеб', 'Даша', 'Егор', 'Женя', 'Зоя', 'Илья', 'Катя', 'Лёва', 'Маша', 'Никита', 'Оля', 'Паша', 'Рита', 'Сева', 'Тася', 'Устин', 'Фаина', 'Хельга', 'Цезарь', 'Шура', 'Эля', 'Юра', 'Яна', 'Тимур', 'Лиза', 'Марат', 'Соня', 'Артём', 'Нина'];
const EN = ['Ada', 'Bram', 'Cleo', 'Dev', 'Ezra', 'Fern', 'Gus', 'Hana', 'Ivo', 'June', 'Kit', 'Lena', 'Milo', 'Nell', 'Otis', 'Pia', 'Quinn', 'Rosa', 'Sol', 'Tess', 'Uma', 'Vik', 'Wren', 'Xan', 'Yara', 'Zed', 'Remy', 'Noor', 'Theo', 'Ines', 'Arlo', 'Mira'];
const LETTERS_RU = 'АБВГДЕЗИКЛМНОПРСТУФ';
const LETTERS_EN = 'ABCDEFGHJKLMNPRSTVW';

function num(seed: string): number {
  return parseInt(hashId(seed), 36);
}

/** Stable, human-friendly worker name derived from the agent id. */
export function nameFor(agentId: string, lang: 'ru' | 'en' = 'ru'): string {
  const n = num(agentId);
  const list = lang === 'ru' ? RU : EN;
  const letters = lang === 'ru' ? LETTERS_RU : LETTERS_EN;
  const first = list[n % list.length]!;
  const initial = letters[Math.floor(n / list.length) % letters.length]!;
  return `${first} ${initial}.`;
}

/** Deterministic 0..1 value for a seed and a channel; used for appearance choices. */
export function seeded(seed: string, channel: number): number {
  return (num(seed + ':' + channel) % 10007) / 10007;
}
