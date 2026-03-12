import Link from "next/link";

const entries = [
  { id: 1, author: "Léa", authorEmoji: "👩", date: "9 mars", title: "Notre appel du soir", excerpt: "Ce soir on a ri pendant une heure en se racontant notre journée. Je t'aime tellement..." },
  { id: 2, author: "Hugo", authorEmoji: "👨", date: "7 mars", title: "Je pensais à toi", excerpt: "En écoutant cette chanson dans le métro, j'ai repensé à notre weekend à Lyon..." },
  { id: 3, author: "Léa", authorEmoji: "👩", date: "5 mars", title: "Photos de voyage", excerpt: "Je t'ai envoyé des photos de mon escapade ce weekend. Tu m'as tellement manqué." },
];

export default function JournalPage() {
  return (
    <div className="min-h-screen pb-28 pt-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Journal 📓</h1>
        <button className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center text-xl font-light shadow-lg shadow-rose-200 hover:bg-rose-600 transition-colors">
          +
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{entry.authorEmoji}</span>
              <p className="text-sm font-semibold text-stone-700">{entry.author}</p>
              <span className="text-stone-200">·</span>
              <p className="text-xs text-stone-400">{entry.date}</p>
            </div>
            <h2 className="font-semibold text-stone-800 mb-1">{entry.title}</h2>
            <p className="text-stone-400 text-sm leading-relaxed line-clamp-2">{entry.excerpt}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-stone-300 text-sm">3 moments partagés 💛</p>
      </div>
    </div>
  );
}
