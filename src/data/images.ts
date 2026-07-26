// نگاشت تصاویر واقعی (public/img) به آیتم‌های محتوایی — با fallback رنگ قبلی
const mediaMap: Record<string, string> = {
  m1: "school", m2: "training", m3: "expo", m4: "meeting", m5: "teamwork",
  m6: "factory", m7: "construction", m8: "school", m9: "datacenter", m10: "energy",
};
const newsMap: Record<string, string> = {
  nw1: "construction", nw2: "teamwork", nw3: "datacenter", nw4: "meeting",
  nw5: "school", nw6: "expo", nw7: "school",
};
const blogMap: Record<string, string> = {
  b1: "construction", b2: "meeting", b3: "school", b4: "expo",
  b5: "teamwork", b6: "factory", b7: "warehouse",
};
const eventMap: Record<string, string> = {
  e1: "meeting", e2: "training", e3: "lab", e4: "datacenter",
  e5: "expo", e6: "datacenter", e7: "teamwork",
};

const url = (name?: string) => (name ? `/img/${name}.jpg` : undefined);

export const mediaImg = (id: string) => url(mediaMap[id]);
export const newsImg = (id: string) => url(newsMap[id]);
export const blogImg = (id: string) => url(blogMap[id]);
export const eventImg = (id: string) => url(eventMap[id]);

// پس‌زمینه‌ی ترکیبی: تصویر (در صورت وجود) + رنگ fallback
export const bgStyle = (img: string | undefined, color: string): React.CSSProperties =>
  img
    ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: color }
    : { backgroundColor: color };
