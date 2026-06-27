import { useState } from "react";
import { knowledgeDocs } from "../data/mock";
import Badge from "../components/Badge";

const categories = ["همه", ...Array.from(new Set(knowledgeDocs.map((d) => d.category)))];

const typeTone: Record<string, "brand" | "green" | "yellow" | "red" | "ink"> = {
  قرارداد: "yellow",
  آموزشی: "green",
  "صورت‌جلسه": "ink",
  گزارش: "brand",
};

export default function Knowledge() {
  const [active, setActive] = useState("همه");
  const docs = active === "همه" ? knowledgeDocs : knowledgeDocs.filter((d) => d.category === active);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">مدیریت دانش</h1>
          <p className="text-sm text-ink-400 mt-1">بانک اسناد سازمانی، آرشیو قراردادها و مستندات آموزشی با جستجوی پیشرفته</p>
        </div>
        <button className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-700">
          + بارگذاری سند
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
              active === c ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ink-100">
        {docs.map((d) => (
          <div key={d.id} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">📄</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{d.category} · {d.owner} · بروزرسانی {d.updatedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-ink-400">{d.size}</span>
              <Badge tone={typeTone[d.type]}>{d.type}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
