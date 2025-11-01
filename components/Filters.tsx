"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const speciesList = ["All","Dog","Cat","Other"] as const;
const sizes = ["All","Small","Medium","Large"] as const;

export default function Filters() {
  const params = useSearchParams();
  const router = useRouter();
  const [species, setSpecies] = useState(params.get("species") ?? "All");
  const [size, setSize] = useState(params.get("size") ?? "All");
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (species === "All") sp.delete("species"); else sp.set("species", species);
    if (size === "All") sp.delete("size"); else sp.set("size", size);
    if (q) sp.set("q", q); else sp.delete("q");
    router.replace(`/adopt?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, size]);

  return (
    <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center">
      <input className="input" placeholder="Search by name, breed, location..." value={q}
        onChange={(e)=>setQ(e.target.value)}
        onKeyDown={(e)=>{ if(e.key==='Enter'){ const sp=new URLSearchParams(Array.from(params.entries())); if(q) sp.set('q',q); else sp.delete('q'); router.replace(`/adopt?${sp.toString()}`) }}}
      />
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select className="input" value={species} onChange={(e)=>setSpecies(e.target.value)}>
          {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={size} onChange={(e)=>setSize(e.target.value)}>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <button className="btn btn-outline" onClick={()=>{ setSpecies("All"); setSize("All"); setQ(""); router.replace("/adopt"); }}>Reset</button>
    </div>
  )
}
