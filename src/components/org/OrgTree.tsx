import { useMemo, useState, type ReactElement } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Person, TreeMaps, TIER_BADGE, TOKENS, descendantCount } from './orgLib';

type Tier = 'collapse' | 'l2' | 'l3' | null;

export default function OrgTree({
  maps, selectedId, onSelect,
}: { maps: TreeMaps; selectedId: string | null; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(maps.roots.map((r) => r.id)));
  const [tier, setTier] = useState<Tier>('l2');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();

  // Visible set when searching: matches + all their ancestors.
  const visible = useMemo(() => {
    if (!q) return null; // null = everything visible
    const set = new Set<string>();
    const matches = (p: Person) =>
      p.name.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q);
    for (const p of maps.byId.values()) {
      if (matches(p)) {
        set.add(p.id);
        let cur: Person | undefined = p;
        while (cur && cur.managerId && maps.byId.has(cur.managerId)) {
          set.add(cur.managerId);
          cur = maps.byId.get(cur.managerId);
        }
      }
    }
    return set;
  }, [q, maps]);

  const applyTier = (t: Tier) => {
    setTier(t);
    const next = new Set<string>();
    if (t === 'collapse') { /* roots only */ }
    else {
      const maxDepth = t === 'l2' ? 1 : 2; // expand nodes with depth < maxDepth
      const walk = (p: Person, depth: number) => {
        if (depth < maxDepth) next.add(p.id);
        for (const c of maps.children.get(p.id) ?? []) walk(c, depth + 1);
      };
      for (const r of maps.roots) walk(r, 0);
    }
    setExpanded(next);
  };

  const toggle = (id: string) => {
    setTier(null); // manual toggle clears tier highlight
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const rows: ReactElement[] = [];
  const render = (p: Person, depth: number) => {
    if (visible && !visible.has(p.id)) return;
    const kids = maps.children.get(p.id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = q ? true : expanded.has(p.id); // search force-opens path without mutating set
    const selected = p.id === selectedId;
    const badge = p.leaderBadge ? TIER_BADGE[p.leaderBadge] : null;
    rows.push(
      <div
        key={p.id}
        onClick={() => onSelect(p.id)}
        className="flex items-center cursor-pointer text-[13px]"
        style={{
          paddingLeft: 12 + depth * 20, paddingRight: 8, height: 34,
          background: selected ? TOKENS.selBg : undefined,
          borderLeft: selected ? `3px solid ${TOKENS.selBar}` : '3px solid transparent',
        }}
        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = TOKENS.hover; }}
        onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = ''; }}
      >
        <span
          className="w-4 shrink-0 flex items-center justify-center text-ls-ink-3"
          onClick={(e) => { if (hasKids) { e.stopPropagation(); toggle(p.id); } }}
        >
          {hasKids ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
        </span>
        {badge && (
          <span className="shrink-0 mr-1.5 rounded px-1 text-[9px] font-bold"
            style={{ background: badge.bg, color: badge.fg, minWidth: 28, textAlign: 'center' }}>
            {p.leaderBadge}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">
          <span style={{ fontWeight: selected ? 700 : 500, color: TOKENS.activeText }}>{p.name}</span>
          {p.title && <span className="ml-1.5 text-[11px]" style={{ color: TOKENS.idle }}>{p.title}</span>}
        </span>
        {hasKids && <span className="ml-2 text-[11px] shrink-0" style={{ color: TOKENS.idle }}>{descendantCount(maps, p.id)}</span>}
      </div>,
    );
    if (isOpen) for (const c of kids) render(c, depth + 1);
  };
  for (const r of maps.roots) render(r, 0);

  const TierBtn = ({ t, label }: { t: Tier; label: string }) => (
    <button onClick={() => applyTier(t)}
      className="text-[11px] font-semibold rounded px-2 py-1 border"
      style={tier === t
        ? { background: TOKENS.tierFill, color: '#fff', borderColor: TOKENS.tierFill }
        : { background: '#fff', color: TOKENS.idle, borderColor: TOKENS.border }}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full" style={{ width: '100%', borderRight: `1px solid ${TOKENS.border}`, background: TOKENS.panel }}>
      <div className="p-3 shrink-0" style={{ borderBottom: `1px solid ${TOKENS.borderSoft}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-[14px]" style={{ color: TOKENS.activeText }}>Organization</div>
          <div className="flex gap-1">
            <TierBtn t="collapse" label="⊟" />
            <TierBtn t="l2" label="L2" />
            <TierBtn t="l3" label="L3" />
          </div>
        </div>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or title..."
          className="w-full text-[12px] rounded px-2 py-1.5 outline-none"
          style={{ border: `1px solid ${TOKENS.border}` }}
        />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {rows}
        {rows.length === 0 && <div className="px-3 py-4 text-[12px]" style={{ color: TOKENS.idle }}>No matches.</div>}
      </div>
    </div>
  );
}
