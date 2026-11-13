# -*- coding: utf-8 -*-
"""Progress report — only items actually done (op on web/app, dev on the new UI test site); unfinished items removed."""
import html, json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "dod"))
from common import CSS as BASE_CSS  # noqa: E402

D = json.loads((HERE / "report.json").read_text(encoding="utf-8"))
OUT = pathlib.Path("/home/ubuntu/projects/Motoshub/contract/گزارش-پیشرفت-فنی-فاز-۱-و-۲-اقلام-تحویل‌شده.pdf")
FIG = HERE / "fig"
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
DATE = "۱۴۰۵/۰۷/۱۸"
ENV = {"op": "وب و اپلیکیشن", "dev": "رابط کاربری جدید"}
ST = {"op": "<span class='st op'>عملیاتی</span>", "dev": "<span class='st dev'>پیاده‌سازی‌شده</span>"}

# category descriptions for the completed state (items formerly «در حال تکمیل» are now part of the new UI)
DESC_FULL_UNUSED = {
    "ایجاد محتوا در قالب پست": "درج پیوست با قالب‌های مختلف و نمایش پوستر و پیوست‌های تصویری و چندرسانه‌ای در محتوا؛ فید با امکان بازارسال؛ واکنش، نظر تودرتو، سنجاق و پیش‌نمایش خودکار نشانی‌های اینترنتی (عنوان، توضیح و تصویر صفحه).",
    "ایجاد نظرسنجی به صورت چند یا تک گزینه‌ای": "نظرسنجی تک‌گزینه‌ای و چندگزینه‌ای با پیوست چندرسانه‌ای، زمان پایان، حالت ناشناس، نمایش لحظه‌ای نتایج، مدیریت پاسخ‌ها (بستن، بازگشایی، فهرست رأی‌دهندگان و خروجی) و نظر روی نظرسنجی؛ قابل استفاده در گروه، کانال و پست داشبورد.",
    "تعامل با دیگر کاربران": "پیوستن و ترک گروه و کانال، افزودن عضو، ارتقا و تنزل نقش مدیر، بی‌صدا کردن، شمارنده‌ی خوانده‌نشده، فایل‌های اختصاصی هر گروه و کانال، دسته‌بندی، اعلان فعالیت‌ها، اتصال خوراک‌های RSS/Atom به گروه و کانال، و گزارش تخلف.",
    "اشاره به کاربران (Mention)": "اشاره به کاربران با پیشنهاد لحظه‌ای افراد هنگام نوشتن، بر اساس اعضای گفتگو و همکاران واحد، و ارسال اعلان به فرد اشاره‌شده.",
    "داشبورد فعالیت‌ها": "داشبورد اختصاصی هر کاربر با نمای کلی فعالیت‌ها و فعالیت‌های اخیر؛ انتشار پست عمومی با هشتگ، اشاره به کاربران و نظرسنجی، و تنظیم حریم خصوصی.",
    "ویدیو": "انتشار ویدیو و آلبوم با حریم خصوصی، نظر، امتیاز و برچسب؛ اتصال به آپارات برای درج ویدیو با لینک و همگام‌سازی کانال سازمان.",
    "انجمن": "انجمن پرسش و پاسخ با دسته‌بندی و مدیریت موضوعات، رأی و پاسخ پذیرفته‌شده، دنبال‌کردن موضوعات و نمایش فعالیت آن‌ها در داشبورد، جمع‌بندی و گزارش عملکرد موضوعات.",
    "مدیریت نشست‌ها": "تاریخچه‌ی آخرین ورودهای موفق با IP، مکان، دستگاه و روش ورود؛ فهرست نشست‌های فعال و خاتمه‌ی نشست.",
    "دوستی و ایجاد ارتباطات": "درخواست، پذیرش، لغو و حذف ارتباط، مسدودسازی، دنبال‌کردن مخاطبان و نمایش محتوای آن‌ها در داشبورد، و تعریف کاربران برجسته با ارتباط خودکار اعضای جدید.",
    "امکانات مختلف امنیتی": "محدودسازی نرخ درخواست و سقف تولید محتوا در بازه‌ی زمانی، مسدودسازی دستی و خودکار زمان‌دار، کپچای قابل‌تنظیم در ورود و ثبت‌نام، دسترسی احرازشده به فایل‌ها، و اسکن ضدویروس ClamAV هنگام بارگذاری و به‌صورت دوره‌ای با قرنطینه و اطلاع‌رسانی.",
    "امکانات کامل راهبری شبکه اجتماعی سازمانی": "سرویس هویت و دسترسی با ساختار سازمانی لایه‌ای و نقش‌های سفارشی؛ پنل راهبری برای صفحات، منوها، ماژول‌ها، لاگ ممیزی، ناظم‌ها، زبان‌ها و ترجمه‌ها، پسوندهای مجاز، کاربران و ورود دسته‌ای از اکسل.",
    "دیگر امکانات": "اپلیکیشن اندروید «دانشمند»؛ جستجوی پیشرفته؛ مدیریت فایل و اسناد با دسته‌بندی؛ تقویم شمسی و میلادی؛ گزارش‌ساز؛ مدیریت اسلایدشو؛ عکس سرصفحه؛ راهنمای تعاملی برخط و مرکز راهنما؛ پیشنهاد ارتباط؛ ویرایشگر پیشرفته؛ ابزارک اوقات شرعی همه‌ی شهرهای ایران.",
    "پروفایل کاربران": "پروفایل سازمانی کاربر (سمت، سطح دسترسی، پروژه‌ها، مهارت‌ها و تخصص‌ها، سوابق همکاری) و صفحه‌ی اختصاصی هر سازمان با معرفی، اعضا، واحدهای زیرمجموعه، پروژه‌ها و محتوای منتشرشده.",
}


DESC_FIX = {
    "امکانات مختلف امنیتی": "مسدودسازی کاربر و دسترسی احرازشده به فایل‌ها از طریق سرویس محتوای پیوست.",
}
for _k in ("p1", "p2"):
    _cats = []
    for _ci, _c in enumerate(D[_k], 1):
        _items = [_i for _i in _c["items"] if _i["s"] != "wip"]
        if _items:
            _c = dict(_c, ci=_ci, items_all=_c["items"], items=_items)
            _cats.append(_c)
    D[_k + "_done"] = _cats


def fa(s):
    return str(s).translate(FA)


def e(s):
    return html.escape(str(s))


def figs(items, cls):
    return "<div class='figs " + cls + "'>" + "".join(
        f"<figure><img src='file://{FIG / f}'><figcaption>{e(c)}</figcaption></figure>" for f, c in items) + "</div>"


def phase(cats, tag):
    out = []
    for c in cats:
        ci = c["ci"]
        num = {id(x): k for k, x in enumerate(c["items_all"], 1)}
        rows = "".join(
            f"<tr><td class='num'><bdi dir='ltr'>{fa(tag)}.{fa(ci)}.{fa(num[id(it)])}</bdi></td><td>{e(it['t'])}</td>"
            f"<td class='sc'><span class='env'>{ENV[it['s']]}</span></td><td class='sc'>{ST[it['s']]}</td></tr>"
            for it in c["items"])
        desc = DESC_FIX.get(c["cat"], c["desc"])
        out.append(f"""<div class='cat'><div class='cat-h'><span class='cat-n'>{fa(ci)}</span><span class='cat-t'>{e(c['cat'])}</span>
<span class='cat-p'>{fa(len(c['items']))} قلم تحویل‌شده</span></div><div class='crit'><b>کار انجام‌شده:</b> {e(desc)}</div>
<table class='items'><colgroup><col style='width:14mm'><col><col style='width:30mm'><col style='width:22mm'></colgroup>
<thead><tr><th>کد</th><th>قلم قرارداد</th><th>محیط ارائه</th><th>وضعیت</th></tr></thead><tbody>{rows}</tbody></table></div>""")
    return "".join(out)


t1 = sum(len(c["items"]) for c in D["p1"])
t2 = sum(len(c["items"]) for c in D["p2"])
n1 = sum(len(c["items"]) for c in D["p1_done"])
n2 = sum(len(c["items"]) for c in D["p2_done"])
o1 = sum(1 for c in D["p1_done"] for i in c["items"] if i["s"] == "op")
o2 = sum(1 for c in D["p2_done"] for i in c["items"] if i["s"] == "op")

ENVS = [
    ("سامانه‌ی وب", "motonext.shub.ir", "Next.js، متصل به درگاه API پروژه؛ وب‌سایت عمومی، ثبت‌نام و ورود، فضای کاری کاربران"),
    ("اپلیکیشن اندروید «دانشمند»", "نسخه‌ی نصبی اندروید", "داشبورد، اخبار، رسانه، رویدادها و جلسات، مجلات، پرسش و پاسخ، اعضای سازمان، جستجو، اعلان‌ها، ورود و ثبت‌نام"),
    ("سرویس‌های شبکه‌ی اجتماعی", "Social API v1.0 — api.shub.ir", "۳۲۳ عملیات در ۷ ماژول: محتوا، هسته، رویداد، انجمن، رسانه، پیام‌رسانی، ارتباطات"),
    ("سرویس هویت و دسترسی", "Identity / IAM", "ساختار سازمانی لایه‌ای، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضا"),
    ("رابط کاربری جدید", "demo.shub.ir", "React و TypeScript، منطبق بر قرارداد سرویس‌های API؛ امکانات تکمیلی فاز اول، امکانات فاز دوم و پیش‌نمایش فاز سوم"),
]
envs = "".join(f"<tr><td class='b'>{e(a)}</td><td class='num'><bdi dir='ltr'>{e(b)}</bdi></td><td>{e(c)}</td><td class='sc'><span class='st dev'>مستقر در محیط تست</span></td></tr>"
               for a, b, c in ENVS)
extra = "".join(f"<tr><td class='b'>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in D["extra"])

STEPS = [
    ("تأمین زیرساخت", "تحویل سرور و تجهیزات شبکه از سوی بنیاد مطابق صورتجلسه‌ی نیازمندی‌های فنی (بند ۲-۲)"),
    ("نصب و پیکربندی", "نصب سرویس‌ها، پایگاه داده، درگاه API، سامانه‌ی وب و رابط کاربری روی زیرساخت بنیاد (on-premise)؛ پیکربندی دامنه و گواهی امنیتی"),
    ("انتقال و پیکربندی سازمانی", "انتقال تنظیمات و داده‌های محیط تست، تعریف ساختار سازمانی، نقش‌ها و کاربران"),
    ("تست پذیرش", "اجرای سناریوهای پذیرش با حضور ناظر بر اساس سند معیارهای پذیرش"),
    ("آموزش و بهره‌برداری آزمایشی", "کارگاه‌های آموزشی راهبران و کاربران و شروع بهره‌برداری آزمایشی"),
    ("تحویل موقت", "تنظیم صورتجلسه‌ی تحویل موقت (بند ۱۲-۱)"),
]
steps = "".join(f"<tr><td class='num'>{fa(i)}</td><td class='b'>{e(a)}</td><td>{e(b)}</td></tr>" for i, (a, b) in enumerate(STEPS, 1))

CSS = BASE_CSS + """
.st{display:inline-block;font-size:7.8pt;font-weight:700;border-radius:3px;padding:0 6px;white-space:nowrap}
.st.op{background:var(--green-soft);color:var(--green)}
.st.dev{background:var(--accent-soft);color:var(--accent)}
.env{font-size:7.8pt;color:var(--muted);white-space:nowrap}
.sc{text-align:center}
.items th{font-size:8pt}
.done{display:flex;gap:10px;margin:10px 0}
.done div{flex:1;border:1px solid var(--line);border-radius:6px;padding:10px 12px;background:var(--green-soft)}
.legend{font-size:8.8pt;margin:6px 0}
.done .v{font-size:22pt;font-weight:900;color:var(--green);line-height:1.2}
.done .l{font-size:9pt}
.bar100{height:9px;border-radius:5px;background:var(--green);margin-top:6px}
.figs{display:grid;gap:8px;margin:8px 0 12px}
.figs.app{grid-template-columns:repeat(3,1fr)}
.figs.web{grid-template-columns:repeat(2,1fr)}
figure{margin:0;break-inside:avoid;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#fff}
figure img{width:100%;display:block}
.figs.app img{max-height:118mm;object-fit:cover;object-position:top}
figcaption{font-size:8.3pt;color:var(--muted);padding:3px 7px;border-top:1px solid var(--line)}
.req{break-inside:avoid}
"""

HTML = f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گزارش پیشرفت فنی فاز اول و دوم</title>
<style>{CSS}</style></head><body>
<div class="cover"><div>
<div class="kicker">پروژه‌ی استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند (موتوشاب سازمانی)</div>
<h1>گزارش پیشرفت فنی<br>فاز اول و فاز دوم</h1>
<div class="sub">اقلام تحویل‌شده‌ی پیوست فنی، محیط تست و برنامه‌ی استقرار روی زیرساخت بنیاد</div>
<div class="bar"></div>
<div class="kpis">
<div class="kpi"><div class="v">{fa(n1 + n2)} قلم</div><div class="l">تکمیل و تحویل‌شده در فاز اول و دوم</div></div>
<div class="kpi"><div class="v">{fa(o1 + o2)} قلم</div><div class="l">عملیاتی در وب و اپلیکیشن</div></div>
<div class="kpi"><div class="v">{fa(323)}</div><div class="l">عملیات API شبکه‌ی اجتماعی در ۷ ماژول</div></div>
<div class="kpi"><div class="v">وب + اندروید</div><div class="l">سامانه و اپلیکیشن «دانشمند»</div></div>
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
<p>نسخه‌ی پایه‌ی موتوشاب بر اساس ساختار و نیازهای هلدینگ دانشمند پیکربندی و شخصی‌سازی شده و به‌صورت <b>سامانه‌ی وب</b>، <b>اپلیکیشن اندروید «دانشمند»</b> و <b>رابط کاربری جدید</b> ارائه شده است. همه‌ی این اجزا بر سرویس‌های شبکه‌ی اجتماعی موتوشاب و سرویس هویت و دسترسی کار می‌کنند. افزونه‌های اختصاصی فاز دوم (پروفایل کاربران، مدیریت دانش و جستجوی پیشرفته) در رابط کاربری جدید پیاده‌سازی شده‌اند. این گزارش اقلامی را شرح می‌دهد که تکمیل شده و روی محیط تست قابل بازدید است؛ اقلام باقی‌مانده در حال پیاده‌سازی است و در گزارش بعدی ارائه می‌شود.</p>
<div class="legend"><span class='st op'>عملیاتی</span> در سامانه‌ی وب یا اپلیکیشن در دسترس کاربران · <span class='st dev'>پیاده‌سازی‌شده</span> در رابط کاربری جدید روی محیط تست قابل بازدید؛ اتصال کامل به سرویس‌ها هم‌زمان با استقرار</div>
<div class="done">
<div><div class="v">{fa(n1)} قلم</div><div class="l">فاز اول — شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه — در {fa(len(D['p1_done']))} بخش</div></div>
<div><div class="v">{fa(n2)} قلم</div><div class="l">فاز دوم — توسعه‌ی دسته‌ی اول افزونه‌های جدید — در {fa(len(D['p2_done']))} بخش</div></div>
</div>
<div class="call"><b>استقرار:</b> برای آنکه تست و بازبینی منتظر تأمین زیرساخت نماند، مطابق بند ۲-۲ قرارداد، سامانه روی دامنه‌ها و سرورهای مجری مستقر شده و برای تست در دسترس است. به‌محض تحویل سرور از سوی بنیاد، استقرار روی زیرساخت بنیاد (on-premise) انجام می‌شود (بخش ۶).</div>
<h3>محیط تست و اجزای تحویل‌شده</h3>
<table class="grid"><thead><tr><th>جزء</th><th>نشانی / نسخه</th><th>شرح فنی</th><th>وضعیت</th></tr></thead><tbody>{envs}</tbody></table>
</div>

<div class="section">
<h2><span class="sec">۲</span>معماری و زیرساخت فنی</h2>
<table class="grid facts"><tbody>
<tr><td>لایه‌ی سرویس</td><td>سرویس‌های REST با مستندات OpenAPI 3؛ ماژول‌های محتوا (خبر، بلاگ، مجله)، رویداد، انجمن، رسانه، پیام‌رسانی (گفتگو، گروه، کانال، بات)، ارتباطات و هسته (برچسب، دسته‌بندی، نظر، واکنش، مدیریت فایل، تنظیمات)؛ درگاه واحد API برای وب و اپلیکیشن</td></tr>
<tr><td>هویت و دسترسی</td><td>ساختار سازمانی لایه‌ای سیستم ← هلدینگ ← شرکت ← واحد، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضای سازمان، ثبت‌نام با کد ملی، کد پرسنلی و شماره‌ی موبایل</td></tr>
<tr><td>سامانه‌ی وب</td><td>Next.js، راست‌چین؛ وب‌سایت عمومی (اخبار، رسانه، رویدادها، وبلاگ، مجلات، پرسش و پاسخ)، حالت روشن/تیره و فضای کاری (اسناد، پروژه‌ها، گزارش‌ها، کاربران، تنظیمات)</td></tr>
<tr><td>اپلیکیشن اندروید</td><td>اپلیکیشن «دانشمند» با برند هلدینگ؛ صفحه‌ی عمومی، ورود و ثبت‌نام، داشبورد فعالیت‌ها، اخبار با فیلتر و دسته‌بندی، مجلات، رسانه، رویدادها، پرسش و پاسخ، اعضای سازمان، جستجو و اعلان‌ها</td></tr>
<tr><td>رابط کاربری جدید</td><td>React و TypeScript؛ منطبق بر قرارداد سرویس‌های API؛ مدل دسترسی لایه‌ای، مرکز راهنمای درون‌برنامه (۴۴ مقاله)، نسخه‌ی قابل نصب وب (PWA)</td></tr>
<tr><td>امنیت</td><td>احراز هویت و ثبت‌نام با اعتبارسنجی، نمایش و خاتمه‌ی نشست‌های فعال، مسدودسازی کاربر، دسترسی احرازشده به فایل‌ها، لاگ ممیزی یکپارچه</td></tr>
<tr><td>مستندات فنی</td><td>مستندات OpenAPI سرویس‌ها، مدل هویت و دسترسی، نگاشت مجوزها، مدل داده‌ی مدیریت دانش، نگاشت رابط کاربری به سرویس‌های API</td></tr>
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
<h2><span class="sec">۳</span>فاز اول — شرح کار و اقلام تحویل‌شده</h2>
{phase(D['p1_done'], '1')}
</div>

<div class="section">
<h2><span class="sec">۴</span>فاز دوم — شرح کار و اقلام تحویل‌شده</h2>
{phase(D['p2_done'], '2')}
<h3>تصاویر رابط کاربری جدید — امکانات فاز دوم</h3>
{figs([('demo_knowledge.jpg', 'داشبورد مدیریت دانش'), ('demo_kmsearch.jpg', 'جستجوی پیشرفته‌ی دانش'), ('demo_profile.jpg', 'پروفایل کاربر'), ('demo_roles.jpg', 'نقش‌ها و مجوزها')], 'web')}
</div>

<div class="section">
<h2><span class="sec">۵</span>دستاوردهای فراتر از اقلام فاز اول و دوم</h2>
<p>علاوه بر اقلام پیوست فنی، امکانات زیر در رابط کاربری جدید توسعه یافته است. بخشی از آن‌ها پیشرفت زودهنگام اقلام فاز سوم است.</p>
<table class="grid"><thead><tr><th style="width:48mm">حوزه</th><th>شرح</th></tr></thead><tbody>{extra}</tbody></table>
{figs([('demo_dashboard.jpg', 'میز کار شخصی'), ('demo_access.jpg', 'نقش و دسترسی من')], 'web')}
</div>

<div class="section">
<h2><span class="sec">۶</span>استقرار روی زیرساخت بنیاد</h2>
<p>طبق بند ۲-۲ قرارداد، تأمین تجهیزات فنی و شبکه با نظارت مجری بر عهده‌ی کارفرماست و در صورت عدم تأمین، مجری سامانه را روی سرور عمومی منتشر و گزارش پیشرفت را بر همین اساس ارائه می‌کند. سامانه اکنون روی محیط تست مجری در دسترس است و پس از تحویل زیرساخت، مراحل زیر انجام می‌شود:</p>
<table class="grid"><thead><tr><th style="width:8mm">#</th><th style="width:44mm">مرحله</th><th>شرح</th></tr></thead><tbody>{steps}</tbody></table>
<div class="req">
<div class="call" style="background:var(--green-soft);border-color:var(--green)"><b>جمع‌بندی:</b> همه‌ی {fa(n1 + n2)} قلم ارائه‌شده در این گزارش (۱۰۰٪) تکمیل شده و روی محیط تست قابل بازدید است: {fa(n1)} قلم در فاز اول و {fa(n2)} قلم در فاز دوم.</div>
<h3>درخواست</h3>
<p>خواهشمند است اقلام تحویل‌شده در این گزارش بر اساس معیارهای پذیرش مصوب بررسی و نتیجه اعلام گردد. همچنین درخواست می‌شود زیرساخت سخت‌افزاری و شبکه برای استقرار on-premise تأمین و به مجری معرفی شود. نمایش زنده‌ی سامانه‌ی وب، اپلیکیشن و رابط کاربری جدید در جلسه‌ی بازبینی با حضور ناظر محترم قابل انجام است.</p>
<div class="sign"><div>مالک محصول — مجری</div><div>ناظر محترم کارفرما</div></div>
</div>
</div>
</body></html>"""

(HERE / "full.html").write_text(HTML, encoding="utf-8")
subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={OUT}", "--allow-file-access-from-files", f"file://{HERE / 'full.html'}"],
               check=True, capture_output=True)
print(OUT, n1, n2)
