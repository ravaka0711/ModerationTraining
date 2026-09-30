import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Check, 
  AlertCircle, 
  Send, 
  RotateCw, 
  Plus, 
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface Commentaire {
  id: number;
  texte: string;
  categorie: string;
  confiance: number | null;
  action_prise: string | null;
  date_creation: string;
}

const CATEGORIES_CONFIG: Record<string, { label: string; type: 'safe' | 'warning' | 'danger' }> = {
  avis_positif: { label: "Avis positif", type: "safe" },
  question: { label: "Question", type: "safe" },
  critique_legitime: { label: "Critique constructive", type: "safe" },
  plainte_reclamation: { label: "Plainte / Réclamation", type: "warning" },
  desinformation: { label: "Désinformation", type: "warning" },
  insulte_menace: { label: "Insulte ou menace", type: "danger" },
  incitation_haine: { label: "Discours de haine", type: "danger" },
  arnaque_scam: { label: "Arnaque / Fraude", type: "danger" },
  spam: { label: "Spam publicitaire", type: "danger" },
};

const EXAMPLES = [
  { label: "Avis positif (Malagasy)", text: "Misaotra betsaka tompoko, tsara be ny entana sady tonga ara-potoana" },
  { label: "Réclamation (Mixte)", text: "taraiky be ny livraison nareo, 3 andro izaho miandry" },
  { label: "Question (Français)", text: "Bonjour, quel est le délai de livraison pour les provinces ?" },
  { label: "Propos injurieux (Malagasy)", text: "Ratsy saina be nareo" },
  { label: "Spam / Arnaque", text: "Gagnez 500.000 Ar par jour facilement en travaillant 10 min en ligne ! Contactez vite ce numéro !" },
];

export default function App() {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [texte, setTexte] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<'all' | 'safe' | 'warning' | 'danger'>('all');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // En développement Vite (port 5173/5174) : appelle http://127.0.0.1:8000
  // En production Docker (Nginx) : appelle relativement "" (Nginx fait le reverse proxy)
  const API_URL = 
    import.meta.env.VITE_API_URL !== undefined 
      ? import.meta.env.VITE_API_URL 
      : (window.location.port === "5173" || window.location.port === "5174" ? "http://127.0.0.1:8000" : "");

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCommentaires = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/commentaires`);
      if (res.ok) {
        const data = await res.json();
        setCommentaires([...data].reverse());
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCommentaires();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!texte.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/commentaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: texte.trim() }),
      });

      if (res.ok) {
        const nouveau = await res.json();
        setCommentaires((prev) => [nouveau, ...prev]);
        setTexte("");
        showNotification('success', `Commentaire classé dans "${CATEGORIES_CONFIG[nouveau.categorie]?.label || nouveau.categorie}"`);
      } else {
        const err = await res.json();
        showNotification('error', err.detail || "Échec de l'analyse");
      }
    } catch {
      showNotification('error', "Impossible de contacter l'API (serveur éteint ou inaccessible)");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/commentaires/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCommentaires((prev) => prev.filter((c) => c.id !== id));
        showNotification('success', `Commentaire #${id} supprimé.`);
      }
    } catch {
      showNotification('error', "Erreur lors de la suppression.");
    }
  };

  const filtered = commentaires.filter((item) => {
    const matchSearch = item.texte.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    const catType = CATEGORIES_CONFIG[item.categorie]?.type || 'safe';
    if (filterTab === 'safe') return catType === 'safe';
    if (filterTab === 'warning') return catType === 'warning';
    if (filterTab === 'danger') return catType === 'danger';
    return true;
  });

  const total = commentaires.length;
  const countSafe = commentaires.filter((c) => (CATEGORIES_CONFIG[c.categorie]?.type || 'safe') === 'safe').length;
  const countWarning = commentaires.filter((c) => CATEGORIES_CONFIG[c.categorie]?.type === 'warning').length;
  const countDanger = total - countSafe - countWarning;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight truncate">
                Modération
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Gestion et classification automatique (FR / Malagasy)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="hidden xs:inline">{apiOnline ? "Connecté" : "Hors ligne"}</span>
            </div>

            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <span>Swagger</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{formOpen ? "Fermer" : "Nouveau"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-auto z-50 transition-all transform animate-in fade-in slide-in-from-bottom-2">
          <div className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium border ${
            notification.type === 'success' 
              ? 'bg-slate-900 text-white border-slate-800' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">
        
        {/* Metric Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block">Total traités</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{total}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">À conserver</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Valides</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{countSafe}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">À réviser</span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Plaintes</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{countWarning}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">À modérer</span>
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Rejets</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{countDanger}</span>
          </div>
        </section>

        {/* Input Form Panel (Collapsible) */}
        {formOpen && (
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Tester un commentaire
              </h2>
              <button 
                onClick={() => setFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                rows={3}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Écrivez ou collez un commentaire pour l'analyser (français, malagasy, ou mixte)..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-lg p-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors resize-none"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Example Quick chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Exemples :</span>
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTexte(ex.text)}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !texte.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Classification en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Analyser et enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search, Filter Bar and List */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs with horizontal touch scroll */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full">
              <button
                onClick={() => setFilterTab('all')}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium whitespace-nowrap shrink-0 transition-all ${
                  filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous ({total})
              </button>
              <button
                onClick={() => setFilterTab('safe')}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium whitespace-nowrap shrink-0 transition-all ${
                  filterTab === 'safe' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                À conserver ({countSafe})
              </button>
              <button
                onClick={() => setFilterTab('warning')}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium whitespace-nowrap shrink-0 transition-all ${
                  filterTab === 'warning' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                À réviser ({countWarning})
              </button>
              <button
                onClick={() => setFilterTab('danger')}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium whitespace-nowrap shrink-0 transition-all ${
                  filterTab === 'danger' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bloqués ({countDanger})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un mot..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none transition-colors"
                />
              </div>

              <button
                onClick={fetchCommentaires}
                title="Actualiser la liste"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
              >
                <RotateCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Aucun commentaire dans cette catégorie.
              </div>
            ) : (
              filtered.map((item) => {
                const conf = CATEGORIES_CONFIG[item.categorie] || { label: item.categorie, type: 'safe' };
                const badgeStyle = 
                  conf.type === 'safe' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
                    : conf.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                    : 'bg-rose-50 text-rose-800 border-rose-200/80';

                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">#{item.id}</span>
                        
                        {/* Category tag */}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                          {conf.label}
                        </span>

                        {/* Action recommendation */}
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {item.action_prise?.replace(/_/g, ' ') || 'Action non définie'}
                        </span>

                        {/* Confidence score */}
                        {item.confiance !== null && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {Math.round(item.confiance * 100)}% conf.
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 ml-auto sm:ml-0">
                          {formatDate(item.date_creation)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-900 leading-relaxed break-words font-normal">
                        {item.texte}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Supprimer"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
