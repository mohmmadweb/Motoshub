# -*- coding: utf-8 -*-
"""Technical progress report (phase 1 & 2) for بنیاد — HTML -> PDF via Chrome."""
import html, json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "dod"))
from common import CSS as BASE_CSS  # noqa: E402

D = json.loads((HERE / "report.json").read_text(encoding="utf-8"))
L = D["label"]
OUT = pathlib.Path("/home/ubuntu/projects/Motoshub/contract/گزارش-پیشرفت-فنی-فاز-۱-و-۲.pdf")
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
FIG = HERE / "fig"
DATE = "۱۴۰۵/۰۷/۱۸"


def fa(s):
    return str(s).translate(FA)


def e(s):
    return html.escape(str(s))


def pct(c):
    t = sum(c.values())
    return {k: round(100 * v / t) for k, v in c.items()}, t


def badge(s):
    return f"<span class='st {s}'>{L[s]}</span>"


def bar(c):
    p, t = pct(c)
    segs = "".join(f"<div class='seg {k}' style='width:{100 * c[k] / t:.2f}%'></div>" for k in ("op", "dev", "wip") if c[k])
    return f"<div class='bar3'>{segs}</div>"


def phase(cats, tag):
    out = []
    for ci, c in enumerate(cats, 1):
        rows = "".join(
            f"<tr><td class='num'><bdi dir='ltr'>{fa(tag)}.{fa(ci)}.{fa(ii)}</bdi></td><td>{e(it['t'])}</td><td class='sc'>{badge(it['s'])}</td></tr>"
            for ii, it in enumerate(c["items"], 1))
        cnt = {k: sum(1 for it in c["items"] if it["s"] == k) for k in ("op", "dev", "wip")}
        summ = " · ".join(f"{L[k]} {fa(v)}" for k, v in cnt.items() if v)
        out.append(f"""<div class='cat'><div class='cat-h'><span class='cat-n'>{fa(ci)}</span><span class='cat-t'>{e(c['cat'])}</span>
<span class='cat-p'>{summ}</span></div><div class='crit'><b>کار انجام‌شده:</b> {e(c['desc'])}</div>
<table class='items'><colgroup><col style='width:14mm'><col><col style='width:30mm'></colgroup><tbody>{rows}</tbody></table></div>""")
    return "".join(out)


def figs(items, cls):
    return "<div class='figs " + cls + "'>" + "".join(
        f"<figure><img src='file://{FIG / f}'><figcaption>{e(c)}</figcaption></figure>" for f, c in items) + "</div>"


c1, c2 = D["p1_count"], D["p2_count"]
p1p, t1 = pct(c1)
p2p, t2 = pct(c2)
done1 = c1["op"] + c1["dev"]
done2 = c2["op"] + c2["dev"]

envs = "".join(f"<tr><td class='b'>{e(a)}</td><td class='num'><bdi dir='ltr'>{e(b)}</bdi></td><td>{e(c)}</td><td class='sc'>{badge(s)}</td></tr>"
               for a, b, c, s in D["envs"])
extra = "".join(f"<tr><td class='b'>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in D["extra"])

remain_rows = []
for ph, cats in (("۱", D["p1"]), ("۲", D["p2"])):
    for c in cats:
        w = [it["t"] for it in c["items"] if it["s"] == "wip"]
        d = [it["t"] for it in c["items"] if it["s"] == "dev"]
        if w or d:
            remain_rows.append(
                f"<tr><td class='num'>{ph}</td><td class='b'>{e(c['cat'])}</td>"
                f"<td>{'<br>'.join(e(x) for x in d) or '—'}</td><td>{'<br>'.join(e(x) for x in w) or '—'}</td></tr>")

CSS = BASE_CSS + """
.st{display:inline-block;font-size:7.8pt;font-weight:700;border-radius:3px;padding:0 6px;white-space:nowrap}
.st.op{background:var(--green-soft);color:var(--green)}
.st.dev{background:var(--accent-soft);color:var(--accent)}
.st.wip{background:var(--amber-soft);color:var(--amber)}
.sc{text-align:center}
.bar3{display:flex;height:9px;border-radius:5px;overflow:hidden;background:var(--soft);margin:4px 0 2px}
.seg.op{background:var(--green)}.seg.dev{background:var(--accent)}.seg.wip{background:#d9a441}
.ph{border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin-bottom:10px}
.ph .t{font-weight:800;font-size:11pt}
.ph .n{font-size:9pt;color:var(--muted)}
.legend span{margin-left:12px;font-size:8.8pt}
.figs{display:grid;gap:8px;margin:8px 0 12px}
.figs.app{grid-template-columns:repeat(3,1fr)}
.figs.web{grid-template-columns:repeat(2,1fr)}
figure{margin:0;break-inside:avoid;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#fff}
figure img{width:100%;display:block}
.figs.app img{max-height:118mm;object-fit:cover;object-position:top}
figcaption{font-size:8.3pt;color:var(--muted);padding:3px 7px;border-top:1px solid var(--line)}
.rem td{font-size:8.3pt;vertical-align:top;padding:3px 6px}
.req{break-inside:avoid}
"""

HTML = f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گزارش پیشرفت فنی فاز اول و دوم</title>
<style>{CSS}</style></head><body>
<div class="cover"><div>
<div class="kicker">پروژه‌ی استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند (موتوشاب سازمانی)</div>
<h1>گزارش پیشرفت فنی<br>فاز اول و فاز دوم</h1>
<div class="sub">شرح کارهای انجام‌شده، وضعیت اقلام پیوست فنی و محیط‌های تحویل‌شده</div>
<div class="bar"></div>
<div class="kpis">
<div class="kpi"><div class="v">{fa(c1['op'] + c2['op'])} قلم</div><div class="l">عملیاتی در وب و اپلیکیشن</div></div>
<div class="kpi"><div class="v">{fa(c1['dev'] + c2['dev'])} قلم</div><div class="l">توسعه‌یافته در نسخه‌ی جدید رابط کاربری</div></div>
<div class="kpi"><div class="v">{fa(323)}</div><div class="l">عملیات API شبکه‌ی اجتماعی در ۷ ماژول</div></div>
<div class="kpi"><div class="v">وب + اندروید</div><div class="l">سامانه و اپلیکیشن «دانشمند» تحویل شده</div></div>
</div></div>
<div class="meta">
<div>کارفرما</div><div>هلدینگ تحقیق و توسعه دانشمند — بنیاد مستضعفان انقلاب اسلامی</div>
<div>مجری</div><div>شرکت دانش افراز فاخر ایرانیان</div>
<div>تهیه‌کننده</div><div>مالک محصول (Product Owner) پروژه</div>
<div>شماره و تاریخ</div><div>گزارش شماره‌ی {fa(1)} — {DATE}</div>
<div>مبنا</div><div>قرارداد و پیوست فنی شماره‌ی یک؛ معیارهای پذیرش در سند «تعریف انجام‌شده و معیارهای پذیرش فازهای پروژه»</div>
</div></div>

<div class="section">
<h2><span class="sec">۱</span>خلاصه‌ی گزارش</h2>
<p>در این دوره، نسخه‌ی پایه‌ی موتوشاب بر اساس ساختار و نیازهای هلدینگ دانشمند پیکربندی و شخصی‌سازی شد و به‌صورت <b>سامانه‌ی وب</b> و <b>اپلیکیشن اندروید «دانشمند»</b> در اختیار کاربران قرار گرفت. هر دو بر سرویس‌های شبکه‌ی اجتماعی موتوشاب (Social API نسخه‌ی ۱) و سرویس هویت و دسترسی کار می‌کنند. هم‌زمان، نسخه‌ی جدید رابط کاربری با تمرکز بر تجربه‌ی کاربری سازمانی توسعه یافت. امکانات فاز دوم (پروفایل کاربران، مدیریت دانش و جستجوی پیشرفته) در این نسخه پیاده‌سازی شده و انتقال آن به نسخه‌ی عملیاتی در جریان است.</p>
<div class="legend">{badge('op')} در سامانه‌ی وب یا اپلیکیشن در دسترس کاربران است · {badge('dev')} در نسخه‌ی جدید رابط کاربری پیاده‌سازی و قابل ارائه است و انتقال آن به نسخه‌ی عملیاتی در جریان است · {badge('wip')} در برنامه‌ی تکمیل</div>
<div class="ph" style="margin-top:10px"><div class="t">فاز اول — شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه</div>
{bar(c1)}<div class="n">{fa(t1)} قلم: {L['op']} {fa(c1['op'])} · {L['dev']} {fa(c1['dev'])} · {L['wip']} {fa(c1['wip'])} — پیاده‌سازی‌شده {fa(done1)} قلم ({fa(round(100 * done1 / t1))}٪)</div></div>
<div class="ph"><div class="t">فاز دوم — توسعه‌ی دسته‌ی اول افزونه‌های جدید</div>
{bar(c2)}<div class="n">{fa(t2)} قلم: {L['op']} {fa(c2['op'])} · {L['dev']} {fa(c2['dev'])} · {L['wip']} {fa(c2['wip'])} — پیاده‌سازی‌شده {fa(done2)} قلم ({fa(round(100 * done2 / t2))}٪)</div></div>

<h3>محیط‌ها و اجزای تحویل‌شده</h3>
<table class="grid"><thead><tr><th>جزء</th><th>نشانی / نسخه</th><th>شرح فنی</th><th>وضعیت</th></tr></thead><tbody>{envs}</tbody></table>
</div>

<div class="section">
<h2><span class="sec">۲</span>معماری و زیرساخت فنی</h2>
<table class="grid facts"><tbody>
<tr><td>لایه‌ی سرویس</td><td>سرویس‌های REST با مستندات OpenAPI 3؛ ماژول‌های محتوا (خبر، بلاگ، مجله)، رویداد، انجمن، رسانه، پیام‌رسانی (گفتگو، گروه، کانال، بات)، ارتباطات و هسته (برچسب، دسته‌بندی، نظر، واکنش، مدیریت فایل، تنظیمات)؛ درگاه واحد API برای وب و اپلیکیشن</td></tr>
<tr><td>هویت و دسترسی</td><td>ساختار سازمانی لایه‌ای سیستم ← هلدینگ ← شرکت ← واحد، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضای سازمان، ثبت‌نام با کد ملی، کد پرسنلی و شماره‌ی موبایل</td></tr>
<tr><td>سامانه‌ی وب</td><td>Next.js، راست‌چین با قلم Sahel؛ وب‌سایت عمومی (اخبار، رسانه، رویدادها، وبلاگ، مجلات، پرسش و پاسخ)، حالت روشن/تیره و فضای کاری (اسناد، پروژه‌ها، گزارش‌ها، کاربران، تنظیمات)</td></tr>
<tr><td>اپلیکیشن اندروید</td><td>اپلیکیشن «دانشمند» با برند هلدینگ؛ صفحه‌ی عمومی، ورود و ثبت‌نام، داشبورد فعالیت‌ها، اخبار با فیلتر و دسته‌بندی، مجلات، رسانه، رویدادها، پرسش و پاسخ، اعضای سازمان، جستجو و اعلان‌ها</td></tr>
<tr><td>نسخه‌ی جدید رابط کاربری</td><td>React و TypeScript؛ منطبق بر قرارداد سرویس‌های API؛ مدل دسترسی لایه‌ای، مرکز راهنمای درون‌برنامه (۴۴ مقاله)، نسخه‌ی قابل نصب وب (PWA)</td></tr>
<tr><td>مستندات فنی</td><td>مستندات OpenAPI سرویس‌ها، مدل هویت و دسترسی، نگاشت مجوزها، مدل داده‌ی مدیریت دانش، نگاشت رابط کاربری به سرویس‌های API، رویدادها و اعلان‌های مدیریت پروژه</td></tr>
</tbody></table>
<h3>تصاویر اپلیکیشن اندروید «دانشمند»</h3>
{figs([('app_landing.jpg', 'صفحه‌ی عمومی'), ('app_login.jpg', 'ورود به سامانه'), ('app_dashboard.jpg', 'داشبورد فعالیت‌های من')], 'app')}
</div>
<div class="section">
{figs([('app_news.jpg', 'اخبار سازمان'), ('app_magazines.jpg', 'مجلات'), ('app_menu.jpg', 'منوی بخش عمومی')], 'app')}
<h3>تصاویر سامانه‌ی وب</h3>
{figs([('web_home.jpg', 'صفحه‌ی اصلی سامانه‌ی وب'), ('web_register.jpg', 'ثبت‌نام کاربران')], 'web')}
</div>

<div class="section">
<h2><span class="sec">۳</span>فاز اول — شرح کار و وضعیت اقلام</h2>
{phase(D['p1'], '1')}
</div>

<div class="section">
<h2><span class="sec">۴</span>فاز دوم — شرح کار و وضعیت اقلام</h2>
{phase(D['p2'], '2')}
<h3>تصاویر نسخه‌ی جدید رابط کاربری — امکانات فاز دوم</h3>
{figs([('demo_knowledge.jpg', 'داشبورد مدیریت دانش'), ('demo_kmsearch.jpg', 'جستجوی پیشرفته‌ی دانش'), ('demo_profile.jpg', 'پروفایل کاربر'), ('demo_roles.jpg', 'نقش‌ها و مجوزها')], 'web')}
</div>

<div class="section">
<h2><span class="sec">۵</span>دستاوردهای فراتر از اقلام فاز اول و دوم</h2>
<p>علاوه بر اقلام پیوست فنی، امکانات زیر در نسخه‌ی جدید رابط کاربری توسعه یافته است. بخشی از آن‌ها پیشرفت زودهنگام اقلام فاز سوم است.</p>
<table class="grid"><thead><tr><th style="width:48mm">حوزه</th><th>شرح</th></tr></thead><tbody>{extra}</tbody></table>
{figs([('demo_dashboard.jpg', 'میز کار شخصی'), ('demo_access.jpg', 'نقش و دسترسی من')], 'web')}
</div>

<div class="section">
<h2><span class="sec">۶</span>برنامه‌ی تکمیل</h2>
<p>اقلام زیر در گام بعد تکمیل می‌شوند. ستون میانی اقلامی است که پیاده‌سازی شده و منتقل‌کردن آن‌ها به نسخه‌ی عملیاتی باقی مانده است. ستون آخر اقلامی است که توسعه‌ی آن‌ها در برنامه است.</p>
<table class="grid rem"><thead><tr><th style="width:8mm">فاز</th><th style="width:36mm">بخش</th><th>{L['dev']} — انتقال به نسخه‌ی عملیاتی</th><th>{L['wip']}</th></tr></thead><tbody>{''.join(remain_rows)}</tbody></table>
<div class="req"><h3>درخواست</h3>
<p>خواهشمند است خروجی‌های این گزارش بر اساس معیارهای پذیرش مصوب بررسی شود و نتیجه یا اصلاحات لازم اعلام گردد. نمایش زنده‌ی سامانه‌ی وب، اپلیکیشن و نسخه‌ی جدید رابط کاربری در جلسه‌ی بازبینی با حضور ناظر محترم قابل انجام است.</p>
<div class="sign"><div>مالک محصول — مجری</div><div>ناظر محترم کارفرما</div></div></div>
</div>
</body></html>"""

(HERE / "report.html").write_text(HTML, encoding="utf-8")
subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={OUT}", "--allow-file-access-from-files", f"file://{HERE / 'report.html'}"],
               check=True, capture_output=True)
print(OUT)
