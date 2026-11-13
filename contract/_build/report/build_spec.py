# -*- coding: utf-8 -*-
"""Implementation spec PDF for the 28 remaining items (internal; for updating demo.shub.ir)."""
import html, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent / "dod"))
from common import CSS as BASE_CSS  # noqa: E402
from spec_data import FEATURES  # noqa: E402

OUT = pathlib.Path("/home/ubuntu/projects/Motoshub/contract/مشخصات-اقلام-باقی‌مانده-برای-دمو.pdf")
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(s):
    return str(s).translate(FA)


def e(s):
    return html.escape(str(s))


def ul(xs, cls=""):
    return f"<ul class='{cls}'>" + "".join(f"<li>{e(x)}</li>" for x in xs) + "</ul>"


import re
FAR = re.compile(r"[\u0600-\u06FF]")


def code(xs):
    out = []
    for x in xs:
        m = re.match(r"^([^\u0600-\u06FF(]*?)\s*(\(.*\))?\s*$", x)
        if FAR.search(x) and m and m.group(2) and not FAR.search(m.group(1)):
            out.append(f"<div><span class='c'>{e(m.group(1))}</span> <span class='cn'>{e(m.group(2).strip('()'))}</span></div>")
        elif FAR.search(x):
            out.append(f"<div class='cn'>{e(x)}</div>")
        else:
            out.append(f"<div><span class='c'>{e(x)}</span></div>")
    return "<div class='code'>" + "".join(out) + "</div>"


n_items = sum(len(f["codes"]) for f in FEATURES)
toc = "".join(
    f"<tr><td class='num b'>{f['id']}</td><td class='b'>{e(f['title'])}</td>"
    f"<td class='num'>{'، '.join(f'<bdi dir=ltr>{fa(c)}</bdi>' for c, _ in f['codes'])}</td><td class='num'>{fa(len(f['codes']))}</td></tr>"
    for f in FEATURES)

blocks = []
for f in FEATURES:
    codes = "".join(f"<tr><td class='num'><bdi dir='ltr'>{fa(c)}</bdi></td><td>{e(t)}</td></tr>" for c, t in f["codes"])
    blocks.append(f"""<div class="feat">
<div class="fh"><span class="fid">{f['id']}</span><span class="ft">{e(f['title'])}</span><span class="fn">{fa(len(f['codes']))} قلم قرارداد</span></div>
<table class="items"><colgroup><col style="width:14mm"><col></colgroup><tbody>{codes}</tbody></table>
<div class="row"><div class="lbl">محل در دمو</div><div>{e(f['place'])}</div></div>
<div class="row"><div class="lbl">داستان کاربر</div><div>{ul(f['stories'])}</div></div>
<div class="row"><div class="lbl">رفتار رابط کاربری</div><div>{ul(f['ui'])}</div></div>
<div class="row"><div class="lbl">مدل داده</div><div>{code(f['data'])}</div></div>
<div class="row"><div class="lbl">endpoint پیشنهادی</div><div>{code(f['api'])}<div class="small">در دمو با برچسب «پیشنهادی» در دکمه‌ی API صفحه ثبت شود (src/social/endpoints.ts).</div></div></div>
<div class="row"><div class="lbl">تنظیمات راهبری</div><div>{ul(f['admin'])}</div></div>
<div class="row acc"><div class="lbl">معیار پذیرش</div><div>{ul(f['accept'], 'chk')}</div></div>
<div class="row"><div class="lbl">فایل‌های دمو</div><div class="files">{e(f['files'])}</div></div>
</div>""")

CSS = BASE_CSS + """
.feat{border:1px solid var(--line);border-radius:7px;margin:0 0 12px;overflow:hidden;break-inside:auto}
.fh{display:flex;align-items:center;gap:8px;background:var(--ink);color:#fff;padding:6px 10px}
.fid{background:#fff;color:var(--ink);font-weight:900;border-radius:4px;padding:0 6px;font-size:9pt}
.ft{font-weight:800;font-size:11.5pt}.fn{margin-right:auto;font-size:8.5pt;opacity:.85}
.feat .items{border-bottom:1px solid var(--line)}
.row{display:grid;grid-template-columns:27mm 1fr;gap:8px;padding:5px 10px;border-bottom:1px solid #eef1f5;break-inside:avoid;font-size:9.2pt}
.row:last-child{border-bottom:0}
.lbl{color:var(--muted);font-weight:700;font-size:8.6pt}
.row ul{margin:0;padding-right:16px}.row li{margin-bottom:2px}
.acc{background:var(--green-soft)}
ul.chk{list-style:none;padding-right:0}ul.chk li:before{content:'☐ ';color:var(--green)}
.code{font-size:8pt;background:var(--soft);border-radius:4px;padding:4px 7px}
.code .c{font-family:ui-monospace,Consolas,monospace;direction:ltr;unicode-bidi:isolate;display:inline-block;text-align:left}
.code .cn{color:var(--muted);font-size:8.2pt}
.code div{margin:1px 0;white-space:pre-wrap;word-break:break-word}
.files{font-size:8.2pt;color:#2b3550}
"""

HTML = f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>مشخصات اقلام باقی‌مانده</title>
<style>{CSS}</style></head><body>
<div class="cover"><div>
<div class="kicker">سند داخلی تیم محصول — پروژه‌ی شبکه‌ی اجتماعی دانشمند</div>
<h1>مشخصات پیاده‌سازی<br>اقلام باقی‌مانده‌ی فاز ۱ و ۲</h1>
<div class="sub">برای به‌روزرسانی نسخه‌ی جدید رابط کاربری (demo.shub.ir) — هر قلم با رفتار، داده، سرویس و معیار پذیرش</div>
<div class="bar"></div>
<div class="kpis">
<div class="kpi"><div class="v">{fa(n_items)} قلم</div><div class="l">اقلام «در حال تکمیل» قرارداد</div></div>
<div class="kpi"><div class="v">{fa(len(FEATURES))} قابلیت</div><div class="l">گروه‌بندی برای پیاده‌سازی</div></div>
<div class="kpi"><div class="v">{fa(27)} + {fa(1)}</div><div class="l">فاز ۱ + فاز ۲</div></div>
<div class="kpi"><div class="v">دمو</div><div class="l">React/TS، داده‌ی شبیه‌سازی‌شده</div></div>
</div></div>
<div class="meta">
<div>کاربرد</div><div>داخلی — برای تیم محصول و توسعه، نه برای ارسال به کارفرما</div>
<div>مبنا</div><div>پیوست فنی قرارداد و بررسی قلم‌به‌قلم کد دمو در ۱۴۰۵/۰۷/۱۸</div>
<div>تاریخ</div><div>۱۴۰۵/۰۷/۱۸</div>
</div></div>

<div class="section">
<h2><span class="sec">۱</span>فهرست قابلیت‌ها</h2>
<table class="grid"><thead><tr><th>شناسه</th><th>قابلیت</th><th>کدهای قرارداد</th><th>تعداد</th></tr></thead><tbody>{toc}</tbody></table>
<h3>قواعد مشترک پیاده‌سازی در دمو</h3>
<ul class="po">
<li>هیچ قابلیت موجودی حذف نمی‌شود و منوی اصلی تغییر نمی‌کند. قابلیت‌ها در زیرمنو، تب یا پنجره‌ی مرتبط قرار می‌گیرند و عنوان صفحه با برچسب منو یکسان است.</li>
<li>مدل داده با نام فیلدهای API (snake_case) نوشته شود. هر endpoint جدید در src/social/endpoints.ts با برچسب «پیشنهادی» ثبت شود تا در دکمه‌ی API صفحه دیده شود.</li>
<li>داده‌ی نمونه‌ی واقع‌نما در data/mock.ts یا seed ماژول اضافه شود، طوری که هر قابلیت بدون آماده‌سازی قبلی قابل نمایش باشد.</li>
<li>دسترسی‌ها از مدل دسترسی لایه‌ای (src/iam) خوانده شود. کاربری که مجوز ندارد دکمه یا بخش را نمی‌بیند.</li>
<li>هر رخداد مهم (رأی، مسدودسازی، اسکن، تغییر تنظیمات) در لاگ ممیزی یکپارچه ثبت شود.</li>
<li>پس از پیاده‌سازی، معیارهای پذیرش هر قابلیت با سناریوی دستی یا Playwright روی vite preview بررسی شود.</li>
</ul>
</div>

<div class="section">
<h2><span class="sec">۲</span>مشخصات قابلیت‌ها</h2>
{''.join(blocks)}
</div>
</body></html>"""

(HERE / "spec.html").write_text(HTML, encoding="utf-8")
subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={OUT}", "--allow-file-access-from-files", f"file://{HERE / 'spec.html'}"],
               check=True, capture_output=True)
print(OUT)
