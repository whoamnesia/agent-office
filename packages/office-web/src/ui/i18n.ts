export type Lang = 'ru' | 'en';
const D = {
  ru: {
    live: 'В эфире', offline: 'Нет связи', connecting: 'Подключение', noToken: 'Нет токена', demo: 'Демо',
    day: 'День', night: 'Ночь', auto: 'Авто', time: 'Время суток',
    dawn: 'Рассвет', dayPhase: 'День', dusk: 'Закат', nightPhase: 'Ночь',
    team: 'Сотрудники', empty: 'Пока никого. Запустите сессию Claude Code с плагином или включите демо.', startDemo: 'Включить демо',
    agents: 'агентов', calls: 'вызовов / 10 мин', errors: 'ошибок', tokens: 'токенов',
    status: { thinking: 'думает', reading: 'читает', writing: 'пишет', running: 'запускает', searching: 'ищет', waiting_user: 'ждёт вас', error: 'ошибка', done: 'готово', idle: 'отдыхает' } as Record<string, string>,
    dept: { frontend: 'Фронтенд', backend: 'Бэкенд', qa: 'Тесты / QA', devops: 'DevOps', docs: 'Документация', research: 'Research', security: 'Безопасность', general: 'Общий' } as Record<string, string>,
    director: 'Директор', type: 'Тип', department: 'Отдел', task: 'Задача', parent: 'Руководитель', session: 'Сессия',
    recentCalls: 'Последние вызовы', files: 'Файлы', noCalls: 'Ещё нет вызовов', close: 'Закрыть',
    weather: 'Погода', weatherNames: { auto: 'Авто', clear: 'Ясно', rain: 'Дождь', snow: 'Снег', fog: 'Туман' } as Record<string, string>,
    sound: 'Звук', soundOn: 'Включить звук', soundOff: 'Выключить звук', photo: 'Снимок', overview: 'Весь квартал', settings: 'Настройки', help: 'Подсказки', hideUI: 'Скрыть интерфейс',
    timeline: 'Лента событий', replay: 'Реплей', backToLive: 'В эфир', pause: 'Пауза', play: 'Воспроизвести', speed: 'Скорость', import: 'Импорт транскрипта', dropHere: 'Отпустите .jsonl транскрипт, чтобы воспроизвести сессию',
    floor: 'Этаж', floors: 'Этажи', cloud: 'Облако', cloudBranch: 'Cloud Branch', relay: 'Relay',
    achievements: 'Достижения', unlocked: 'Достижение', language: 'Язык', cycle: 'Длина суток, мин', quality: 'Качество', fps: 'Лимит FPS',
    reducedMotion: 'Меньше движения', colorblind: 'Палитра для дальтоников', uiScale: 'Масштаб интерфейса', seasonal: 'Сезонные украшения', healthWeather: 'Погода отражает здоровье проекта',
    appearance: 'Внешность сотрудника', save: 'Сохранить', cancel: 'Отмена', saved: 'Сохранено в конфиг',
    shortcuts: 'Клавиши', kN: 'день / ночь / авто', kF: 'весь квартал', kArrows: 'двигать камеру', kZoom: 'приблизить / отдалить', kEsc: 'снять выбор', kH: 'скрыть интерфейс (заставка)', kP: 'снимок', kSpace: 'пауза реплея', kL: 'список сотрудников',
    deadline: 'Дедлайн: много ошибок', friday: 'Пятница!', tokensShort: 'ток.', ms: 'мс', minimap: 'Мини-карта', noTokenHint: 'Откройте ссылку из команды /agent-office:office — в ней есть токен доступа.',
    qualityNames: { auto: 'Авто', high: 'Высокое', low: 'Экономное' } as Record<string, string>,
    you: 'вы',
    skip: 'Перейти к списку сотрудников', tools: 'Инструменты', agentCard: 'Карточка сотрудника', stage: 'Изометрический вид офиса',
  },
  en: {
    live: 'Live', offline: 'Offline', connecting: 'Connecting', noToken: 'No token', demo: 'Demo',
    day: 'Day', night: 'Night', auto: 'Auto', time: 'Time of day',
    dawn: 'Dawn', dayPhase: 'Day', dusk: 'Dusk', nightPhase: 'Night',
    team: 'Team', empty: 'Nobody here yet. Start a Claude Code session with the plugin or switch on the demo.', startDemo: 'Start demo',
    agents: 'agents', calls: 'calls / 10 min', errors: 'errors', tokens: 'tokens',
    status: { thinking: 'thinking', reading: 'reading', writing: 'writing', running: 'running', searching: 'searching', waiting_user: 'needs you', error: 'error', done: 'done', idle: 'idle' } as Record<string, string>,
    dept: { frontend: 'Frontend', backend: 'Backend', qa: 'Tests / QA', devops: 'DevOps', docs: 'Docs', research: 'Research', security: 'Security', general: 'General' } as Record<string, string>,
    director: 'Director', type: 'Type', department: 'Department', task: 'Task', parent: 'Reports to', session: 'Session',
    recentCalls: 'Recent tool calls', files: 'Files', noCalls: 'No calls yet', close: 'Close',
    weather: 'Weather', weatherNames: { auto: 'Auto', clear: 'Clear', rain: 'Rain', snow: 'Snow', fog: 'Fog' } as Record<string, string>,
    sound: 'Sound', soundOn: 'Turn sound on', soundOff: 'Turn sound off', photo: 'Snapshot', overview: 'Whole block', settings: 'Settings', help: 'Shortcuts', hideUI: 'Hide interface',
    timeline: 'Event feed', replay: 'Replay', backToLive: 'Go live', pause: 'Pause', play: 'Play', speed: 'Speed', import: 'Import transcript', dropHere: 'Drop a .jsonl transcript to replay the session',
    floor: 'Floor', floors: 'Floors', cloud: 'Cloud', cloudBranch: 'Cloud Branch', relay: 'Relay',
    achievements: 'Achievements', unlocked: 'Achievement', language: 'Language', cycle: 'Day length, min', quality: 'Quality', fps: 'FPS limit',
    reducedMotion: 'Reduce motion', colorblind: 'Colour-blind palette', uiScale: 'Interface scale', seasonal: 'Seasonal decorations', healthWeather: 'Weather follows project health',
    appearance: 'Worker appearance', save: 'Save', cancel: 'Cancel', saved: 'Saved to config',
    shortcuts: 'Keys', kN: 'day / night / auto', kF: 'whole block', kArrows: 'move the camera', kZoom: 'zoom in / out', kEsc: 'clear selection', kH: 'hide interface (screensaver)', kP: 'snapshot', kSpace: 'pause replay', kL: 'team list',
    deadline: 'Deadline: lots of errors', friday: 'Friday!', tokensShort: 'tok', ms: 'ms', minimap: 'Minimap', noTokenHint: 'Open the link printed by /agent-office:office — it carries the access token.',
    qualityNames: { auto: 'Auto', high: 'High', low: 'Battery saver' } as Record<string, string>,
    you: 'you',
    skip: 'Skip to team list', tools: 'Tools', agentCard: 'Agent card', stage: 'Isometric office view',
  },
};
export type Dict = (typeof D)['ru'];
export function dict(lang: Lang): Dict {
  return D[lang] as Dict;
}
export function detectLang(pref: string | undefined): Lang {
  if (pref === 'ru' || pref === 'en') return pref;
  return (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}
