import { ArrowUpRight, Heart, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LegacyCard({ legacy, onDelete }) {
  const id = legacy.legacyId || legacy.id;
  const photo = legacy.photoUrl || legacy.photoKey;
  return <article className="legacy-card"><div className="legacy-photo">{photo ? <img src={photo} alt={legacy.name ? `${legacy.name}'s portrait` : 'Legacy portrait'} /> : <div className="legacy-monogram">{legacy.name?.slice(0, 1) || <Heart />}</div>}</div><div className="legacy-card-body"><p className="eyebrow">{legacy.relationship || 'Digital legacy'}</p><h2>{legacy.name || 'Untitled legacy'}</h2><p className="legacy-description">{legacy.description || 'A private collection of the stories that matter.'}</p><div className="legacy-meta"><span>{legacy.memoryCount ?? legacy.memoriesCount ?? 0} memories</span><span>{legacy.updatedAt ? `Updated ${new Date(legacy.updatedAt).toLocaleDateString()}` : 'New legacy'}</span></div><div className="legacy-actions"><Link to={`/legacy/${id}`} className="gold-button">Enter legacy <ArrowUpRight size={16} /></Link><Link aria-label={`Edit ${legacy.name || 'legacy'}`} to={`/legacies/${id}/edit`} className="icon-button"><Pencil size={16} /></Link><button aria-label={`Delete ${legacy.name || 'legacy'}`} onClick={() => onDelete(legacy)} className="icon-button"><Trash2 size={16} /></button></div></div></article>;
}
