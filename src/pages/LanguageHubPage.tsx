import { useEffect, useState } from 'react';
import { ArrowRight, Download, Film, Volume2 } from 'lucide-react';
import { api } from '../api/client.ts';
import { LearnSubNav } from '../components/LearnSubNav.tsx';
import { VideoLessonPlayer } from '../components/VideoLessonPlayer.tsx';
import { speakPhrase } from '../utils/speech.ts';
import type { Lesson, PageRoute } from '../types.ts';

interface LanguageHubPageProps {
  language: 'english' | 'french';
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

interface AlphabetItem {
  letter: string;
  ipa: string;
  word: string;
  note: string;
}

const ENGLISH_ALPHABET: AlphabetItem[] = [
  { letter: 'A a', ipa: '/eɪ/ · /æ/', word: 'Apple / Cake', note: 'Short /æ/ vs. long diphthong /eɪ/' },
  { letter: 'B b', ipa: '/biː/', word: 'Book', note: 'Voiced bilabial stop' },
  { letter: 'C c', ipa: '/siː/', word: 'City / Cat', note: 'Soft /s/ before e/i/y, hard /k/ elsewhere' },
  { letter: 'D d', ipa: '/diː/', word: 'Desk', note: 'Voiced alveolar stop' },
  { letter: 'E e', ipa: '/iː/ · /e/', word: 'Pen / Tree', note: 'Short /e/ vs. long /iː/' },
  { letter: 'F f', ipa: '/ef/', word: 'Focus', note: 'Voiceless labiodental fricative' },
  { letter: 'G g', ipa: '/dʒiː/', word: 'Goal / Page', note: 'Hard /ɡ/ or soft /dʒ/' },
  { letter: 'H h', ipa: '/eɪtʃ/', word: 'Hello', note: 'Aspirated /h/ at syllable start' },
  { letter: 'I i', ipa: '/aɪ/ · /ɪ/', word: 'Ship / Time', note: 'Short /ɪ/ vs. long diphthong /aɪ/' },
  { letter: 'J j', ipa: '/dʒeɪ/', word: 'Journal', note: 'Always /dʒ/' },
  { letter: 'K k', ipa: '/keɪ/', word: 'Key', note: 'Silent before n (know)' },
  { letter: 'L l', ipa: '/el/', word: 'Learn', note: 'Light L before vowels' },
  { letter: 'M m', ipa: '/em/', word: 'Method', note: 'Bilabial nasal' },
  { letter: 'N n', ipa: '/en/', word: 'Note', note: 'Alveolar nasal' },
  { letter: 'O o', ipa: '/oʊ/ · /ɒ/', word: 'Hot / Hope', note: 'Short vowel vs. rounded glide' },
  { letter: 'P p', ipa: '/piː/', word: 'Practice', note: 'Aspirated /pʰ/ initially' },
  { letter: 'Q q', ipa: '/kjuː/', word: 'Question', note: 'Paired with u as /kw/' },
  { letter: 'R r', ipa: '/ɑːr/', word: 'Read', note: 'Smooth retroflex/approximant' },
  { letter: 'S s', ipa: '/es/', word: 'Speak', note: 'Voiceless /s/ or voiced /z/' },
  { letter: 'T t', ipa: '/tiː/', word: 'Text', note: 'Combined with h for /θ/ or /ð/' },
  { letter: 'U u', ipa: '/juː/ · /ʌ/', word: 'Cup / Music', note: 'Central /ʌ/ vs. /juː/' },
  { letter: 'V v', ipa: '/viː/', word: 'Voice', note: 'Voiced labiodental fricative' },
  { letter: 'W w', ipa: '/ˈdʌb.əl.juː/', word: 'Write / Word', note: 'Rounded glide; silent before r' },
  { letter: 'X x', ipa: '/eks/', word: 'Exam', note: '/ks/ or /ɡz/ between vowels' },
  { letter: 'Y y', ipa: '/waɪ/', word: 'Year', note: 'Consonant /j/ or vowel /i/' },
  { letter: 'Z z', ipa: '/zed/ · /ziː/', word: 'Zero', note: 'Voiced alveolar fricative' },
];

const FRENCH_ALPHABET: AlphabetItem[] = [
  { letter: 'A a', ipa: '/a/', word: 'Ami', note: 'Open front vowel' },
  { letter: 'B b', ipa: '/be/', word: 'Bonjour', note: 'Voiced bilabial stop' },
  { letter: 'C c', ipa: '/se/', word: 'Café / Cerise', note: 'Soft /s/ before e/i/y; cédille Ç before a/o/u' },
  { letter: 'D d', ipa: '/de/', word: 'Demain', note: 'Dental stop (tongue against upper teeth)' },
  { letter: 'E e', ipa: '/ə/', word: 'Le / Fenêtre', note: 'Neutral schwa /ə/, often silent at word end' },
  { letter: 'É é', ipa: '/e/', word: 'École / Café', note: 'Accent aigu: closed /e/ sound' },
  { letter: 'È è / Ê ê', ipa: '/ɛ/', word: 'Mère / Fête', note: 'Accent grave & circonflexe: open /ɛ/ sound' },
  { letter: 'F f', ipa: '/ɛf/', word: 'Français', note: 'Voiceless fricative' },
  { letter: 'G g', ipa: '/ʒe/', word: 'Gare / Page', note: 'Hard /ɡ/ or soft /ʒ/ before e/i/y' },
  { letter: 'H h', ipa: '/aʃ/', word: 'Heure / Hôtel', note: 'Always silent; h muet allows liaison' },
  { letter: 'I i', ipa: '/i/', word: 'Livre', note: 'Pure high front vowel' },
  { letter: 'J j', ipa: '/ʒi/', word: 'Journal', note: 'Soft /ʒ/ as in "measure"' },
  { letter: 'L l', ipa: '/ɛl/', word: 'Langue', note: 'Clear L throughout word' },
  { letter: 'M m', ipa: '/ɛm/', word: 'Matin', note: 'Forms nasal vowels before consonants' },
  { letter: 'N n', ipa: '/ɛn/', word: 'Nom', note: 'Forms nasal vowels (on, an, in)' },
  { letter: 'O o', ipa: '/o/ · /ɔ/', word: 'Mot / Porte', note: 'Closed /o/ or open /ɔ/' },
  { letter: 'P p', ipa: '/pe/', word: 'Paris', note: 'Unaspirated crisp /p/' },
  { letter: 'Q q', ipa: '/ky/', word: 'Question', note: 'Usually "qu" pronounced /k/' },
  { letter: 'R r', ipa: '/ɛʁ/', word: 'Rendez-vous', note: 'Gentle uvular fricative /ʁ/' },
  { letter: 'S s', ipa: '/ɛs/', word: 'Salut / Maison', note: 'Single s between vowels is voiced /z/' },
  { letter: 'T t', ipa: '/te/', word: 'Temps', note: 'Often silent at word end unless liaison' },
  { letter: 'U u', ipa: '/y/', word: 'Tu / Musique', note: 'Rounded front vowel /y/ (distinct from "ou" /u/)' },
  { letter: 'V v', ipa: '/ve/', word: 'Voyage', note: 'Voiced labiodental fricative' },
  { letter: 'Ç ç', ipa: '/s/', word: 'Français / Garçon', note: 'Cédille forces soft /s/ before a, o, u' },
  { letter: 'Œ œ', ipa: '/œ/', word: 'Cœur / Sœur', note: 'Rounded front mid vowel' },
  { letter: 'Z z', ipa: '/zɛd/', word: 'Zéro', note: 'Voiced fricative' },
];

export function LanguageHubPage({ language, currentRoute, onNavigate }: LanguageHubPageProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AlphabetItem>(
    language === 'french' ? FRENCH_ALPHABET[0] : ENGLISH_ALPHABET[0]
  );

  const items = language === 'french' ? FRENCH_ALPHABET : ENGLISH_ALPHABET;

  useEffect(() => {
    setSelectedItem(language === 'french' ? FRENCH_ALPHABET[0] : ENGLISH_ALPHABET[0]);
    void api
      .get<{ lessons: Lesson[] }>('/lessons', { params: { language } })
      .then((res) => setLessons(Array.isArray(res.data?.lessons) ? res.data.lessons : []))
      .catch(() => {});
  }, [language]);

  const pronunciationLessons = (Array.isArray(lessons) ? lessons : []).filter(
    (l) => l.skillType === 'alphabet' || l.skillType === 'pronunciation'
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-14rem)]">
      <LearnSubNav currentRoute={currentRoute} onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              {language === 'english' ? 'English Curriculum Hub' : 'Parcours Français'}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'english'
                ? 'English Alphabet, Pronunciation & Skill Studio'
                : 'French Alphabet, Accents, Liaisons & Skill Studio'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {language === 'english'
                ? 'Select any letter to hear British/International English articulation, contrast vowels, and launch all eight core skill modules.'
                : 'Click any French letter or accented character to hear native Parisian pronunciation, study nasal vowels, and jump into skill modules.'}
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 self-start">
            <button
              type="button"
              onClick={() => onNavigate('/english')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                language === 'english'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/french')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                language === 'french'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              French
            </button>
          </div>
        </div>

        {/* Interactive Alphabet & Phonetics Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {language === 'english' ? 'Interactive English Alphabet (26 Letters)' : 'Alphabet Français & Signes Diacritiques'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click any tile to hear audio
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
              {items.map((item) => {
                const active = selectedItem.letter === item.letter;
                return (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      speakPhrase(item.word.replace(/\//g, ', '), language, 0.85);
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    }`}
                  >
                    <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {item.letter}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.ipa}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control & Concept Deck */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Active Phonetic Focus
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
                  {selectedItem.letter}
                </h3>
                <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                  {selectedItem.ipa}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Model Vocabulary</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedItem.word}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedItem.note}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => speakPhrase(selectedItem.word.replace(/\//g, ', '), language, 0.7)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Volume2 className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                Slow (0.7x)
              </button>
              <button
                type="button"
                onClick={() => speakPhrase(selectedItem.word.replace(/\//g, ', '), language, 1.0)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Volume2 className="h-4 w-4" />
                Normal (1.0x)
              </button>
            </div>
          </div>
        </div>

        {/* Pronunciation & Alphabet Lessons from DB */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {language === 'english' ? 'Alphabet & Pronunciation Modules' : 'Modules Alphabet & Prononciation'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pronunciationLessons.map((lesson) => (
              <div
                key={lesson._id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {lesson.level} · {lesson.skillType}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {lesson.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lesson.content}
                  </p>
                </div>

                {lesson.examples.length > 0 && (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 pt-2">
                    {lesson.examples.map((ex, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{ex.phrase}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono mr-2">{ex.phonetic}</span>
                            {ex.translation}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakPhrase(ex.phrase, language, 0.9)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenVideoId((prev) => (prev === lesson._id ? null : lesson._id))}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <Film className="h-3.5 w-3.5" />
                    {openVideoId === lesson._id ? 'Hide Video Lesson' : 'Watch Video Lesson'}
                  </button>
                  {lesson.pdfTitle && (
                    <a
                      href={`/api/lessons/${lesson._id}/pdf`}
                      download
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download {lesson.pdfTitle}
                    </a>
                  )}
                </div>

                {openVideoId === lesson._id && (
                  <div className="pt-2">
                    <VideoLessonPlayer
                      title={lesson.title}
                      language={lesson.language}
                      level={lesson.level}
                      skillType={lesson.skillType}
                      summary={lesson.summary}
                      content={lesson.content}
                      examples={lesson.examples}
                      videoUrl={lesson.videoUrl}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Jump to All Skill Labs */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
            Continue to Interactive Skill Studios
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(
              [
                ['Grammar', '/grammar'],
                ['Vocabulary', '/vocabulary'],
                ['Listening', '/listening'],
                ['Speaking', '/speaking'],
                ['Reading', '/reading'],
                ['Writing', '/writing'],
                ['Video Lessons', '/videos'],
              ] as Array<[string, PageRoute]>
            ).map(([label, route]) => (
              <button
                key={route}
                type="button"
                onClick={() => onNavigate(route)}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <span>{label}</span>
                <ArrowRight className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
