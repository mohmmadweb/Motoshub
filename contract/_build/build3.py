# -*- coding: utf-8 -*-
"""DoD v3 — client-facing (audience: بنیاد / هلدینگ دانشمند). Technical only: no payments, penalties or internal notes."""
import html, subprocess, pathlib, sys

WORK = pathlib.Path(__file__).parent
sys.path.insert(0, str(WORK))
src = (WORK / "build2.py").read_text(encoding="utf-8")
ns = {"__file__": str(WORK / "build2.py")}
exec(src[:src.index("# ---------------------------------------------------------------- html helpers")], ns)
P1, P2, P3, CSS = ns["P1"], ns["P2"], ns["P3"], ns["BASE_CSS"] + ".levels td:first-child{width:30mm}.levels td div{font-size:9.2pt}"
OUT = pathlib.Path("/home/ubuntu/projects/Motoshub/contract/DoD-معیارهای-پذیرش-فازهای-پروژه.pdf")
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(s):
    return str(s).translate(FA)


def e(s):
    return html.escape(str(s))


def checklist(rows, tag):
    out, n = [], 0
    for ci, (cat, src_, crit, items, _r, _w) in enumerate(rows, 1):
        lis = []
        for ii, it in enumerate(items):
            n += 1
            lis.append(f'<tr><td class="num"><bdi dir="ltr">{fa(tag)}.{fa(ci)}.{fa(ii + 1)}</bdi></td>'
                       f'<td>{e(it)}</td></tr>')
        out.append(f'''<div class="cat"><div class="cat-h"><span class="cat-n">{fa(ci)}</span>
<span class="cat-t">{e(cat)}</span><span class="cat-p">{fa(len(items))} قلم</span></div>
<div class="crit"><b>معیار پذیرش:</b> {e(crit)}</div>
<table class="items"><colgroup><col style="width:14mm"><col></colgroup><tbody>{"".join(lis)}</tbody></table></div>''')
    return "".join(out), n


def grid(rows, head):
    trs = "".join("<tr>" + "".join(f"<td class='{'b' if i == 0 else ''}'>{e(c)}</td>" for i, c in enumerate(r)) + "</tr>"
                  for r in rows)
    return f"<table class='grid'><thead><tr>{''.join(f'<th>{h}</th>' for h in head)}</tr></thead><tbody>{trs}</tbody></table>"


h1, n1 = checklist(P1, "1")
h2, n2 = checklist(P2, "2")
h3, n3 = checklist(P3, "3")

LEVELS = [
    ("قلم (قابلیت)", "روی نسخه‌ی مستقر سامانه در دسترس کاربران باشد · سناریوی پذیرش آن با حضور ناظر اجرا و تأیید شود · در راهنمای کاربری/راهبری مستند شده باشد · شواهد (تصویر صفحه، نشانی صفحه) ثبت شده باشد"),
    ("فاز", "همه‌ی اقلام فاز پذیرفته شده باشند یا تغییرشان طی صورتجلسه تأیید شده باشد · کارگاه آموزشی پایان فاز برای راهبران و کاربران برگزار شده باشد · مستندات فاز تحویل شده باشد · گزارش پیشرفت فاز با تأیید ناظر ارائه شده باشد"),
    ("پروژه", "بهره‌برداری آزمایشی و گزارش تست‌ها · صورتجلسه‌ی تحویل موقت · گواهی افتا · گزارش نهایی · تحویل کلیه‌ی اسناد فنی، اجرایی و عملیاتی · دوره‌ی تضمین ۱۲ ماهه و تحویل قطعی"),
]
PHASE_DOD = {
    1: ["نسخه‌ی پایه‌ی موتوشاب بر اساس ساختار و نیازهای هلدینگ پیکربندی و شخصی‌سازی و بر زیرساخت کارفرما مستقر شده باشد.",
        f"{fa(n1)} قلم امکانات فاز اول روی نسخه‌ی مستقر قابل ارائه باشند.",
        "نسخه‌ی اندروید و راهنمای کامل کاربری و راهبری تحویل شده باشد.",
        "کارگاه‌های آموزشی راهبران و کاربران در هلدینگ برگزار شده باشد."],
    2: ["افزونه‌های اختصاصی «پروفایل کاربران»، «مدیریت دانش» و «جستجوی پیشرفته» به نسخه‌ی مستقر اضافه شده باشند.",
        f"{fa(n2)} قلم امکانات فاز دوم روی نسخه‌ی مستقر قابل ارائه باشند.",
        "کارگاه آموزشی امکانات جدید برگزار و راهنمای بخش‌های جدید تحویل شده باشد."],
    3: ["افزونه‌های مدیریت پروژه، قراردادهای فناورانه، صندوق‌های مالی، فرصت‌های پژوهشی و گزارش‌گیری پیشرفته به نسخه‌ی مستقر اضافه شده باشند.",
        f"{fa(n3)} قلم امکانات فاز سوم روی نسخه‌ی مستقر قابل ارائه باشند.",
        "کارگاه آموزشی امکانات جدید برگزار و راهنمای بخش‌های جدید تحویل شده باشد."],
}


def pdod(k):
    return "<ol class='find'>" + "".join(f"<li>{e(x)}</li>" for x in PHASE_DOD[k]) + "</ol>"


gantt = "".join(
    f"<tr><td class='b'>{a}</td><td>{b}</td>" + "".join(f"<td class='m{' on' if m in ms else ''}'></td>" for m in range(1, 7)) + "</tr>"
    for a, b, ms in [("فاز اول", "شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه", {1}),
                     ("فاز دوم", "توسعه‌ی دسته‌ی اول افزونه‌های جدید", {2, 3}),
                     ("فاز سوم", "توسعه‌ی دسته‌ی دوم افزونه‌های جدید", {4, 5, 6})])

DELIVERY = [
    ("بهره‌برداری آزمایشی و گزارش تست", "بند ۱۲-۱", "اجرای آزمایشی سامانه پس از استقرار؛ گزارش تست عملکردی، امنیتی و پذیرش با تأیید ناظر"),
    ("تحویل موقت", "بند ۱۲-۱", "تست و بازرسی با حضور ناظر و نماینده‌ی کارفرما و تنظیم صورتجلسه‌ی تحویل موقت"),
    ("آموزش", "بند ۵-۷", "آموزش کاربران به میزان حداقل ۲۴ نفرساعت پیش از استقرار کامل، به‌علاوه‌ی کارگاه پایان هر فاز"),
    ("گواهی افتا", "بند ۵-۳", "اخذ و ارائه‌ی گواهی افتا برای تحویل نهایی سامانه"),
    ("مستندات", "بند ۹-۳ و ۹-۴", "گزارش نهایی و کلیه‌ی اسناد فنی، اجرایی و عملیاتی، از جمله دستورالعمل کار با نرم‌افزار"),
    ("تضمین و پشتیبانی", "ماده ۸ و بند ۵-۴", "۱۲ ماه تضمین از تاریخ تحویل موقت و یک سال پشتیبانی شامل نصب، نگهداشت و به‌روزرسانی"),
    ("تحویل قطعی", "بند ۱۲-۲", "کنترل کیفیت موارد تحویلی در پایان دوره‌ی تضمین و تنظیم صورتجلسه‌ی تحویل قطعی"),
]

CSS3 = CSS + """
.gantt td.m{width:13mm}.gantt td.m.on{background:var(--ink)}
.items td{font-size:9.4pt}
"""

HTML = f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>معیارهای پذیرش فازهای پروژه</title>
<style>{CSS3}</style></head><body>
<div class="cover"><div>
<div class="kicker">پروژه‌ی استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند (موتوشاب سازمانی)</div>
<h1>تعریف انجام‌شده (DoD)<br>و معیارهای پذیرش فازهای پروژه</h1>
<div class="sub">مستخرج از قرارداد و پیوست فنی شماره‌ی یک — مبنای ارائه و پذیرش خروجی‌های هر فاز</div>
<div class="bar"></div>
<div class="kpis">
<div class="kpi"><div class="v">{fa(3)} فاز</div><div class="l">طبق ساختار پیشنهاد پیوست فنی</div></div>
<div class="kpi"><div class="v">{fa(n1)} قلم</div><div class="l">فاز اول · {fa(len(P1))} بخش</div></div>
<div class="kpi"><div class="v">{fa(n2)} قلم</div><div class="l">فاز دوم · {fa(len(P2))} بخش</div></div>
<div class="kpi"><div class="v">{fa(n3)} قلم</div><div class="l">فاز سوم · {fa(len(P3))} بخش</div></div>
</div></div>
<div class="meta">
<div>کارفرما</div><div>هلدینگ تحقیق و توسعه دانشمند — بنیاد مستضعفان انقلاب اسلامی</div>
<div>مجری</div><div>شرکت دانش افراز فاخر ایرانیان</div>
<div>تهیه‌کننده</div><div>مالک محصول (Product Owner) پروژه</div>
<div>تاریخ</div><div>{fa("1405/07/18")} — نسخه‌ی {fa("1.0")}</div>
</div></div>

<div class="section">
<h2><span class="sec">۱</span>مبنا و ساختار</h2>
<p>این سند معیارهای پذیرش (Definition of Done) هر فاز را بر اساس قرارداد «استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند» و پیوست فنی شماره‌ی یک تعریف می‌کند تا ارائه‌ی خروجی هر فاز و بررسی آن توسط ناظر محترم بر مبنای مشترک و قابل‌سنجش انجام شود. طبق پیوست فنی، پروژه در سه فاز عملیاتی اجرا می‌شود: در فاز اول نسخه‌ی پایه‌ی موتوشاب پیکربندی، شخصی‌سازی و مستقر می‌شود و در دو فاز بعد امکانات جدید به‌صورت افزونه‌های اختصاصی به همان نسخه افزوده می‌شوند.</p>
<h3>برنامه‌ی زمانی فازها (جدول زمان‌بندی پیوست فنی)</h3>
<table class="grid gantt"><thead><tr><th>فاز</th><th>عنوان</th>{"".join(f"<th>ماه {fa(m)}</th>" for m in range(1, 7))}</tr></thead><tbody>{gantt}</tbody></table>
<h3>سطوح تعریف انجام‌شده</h3>
<table class="grid levels"><thead><tr><th>سطح</th><th>انجام‌شده یعنی</th></tr></thead><tbody>
{"".join(f"<tr><td class='b'>{e(a)}</td><td>{''.join(f'<div>• {e(x.strip())}</div>' for x in b.split('·'))}</td></tr>" for a, b in LEVELS)}
</tbody></table>
<h3>روال پذیرش هر فاز</h3>
<p>در پایان هر فاز، گزارش پیشرفت به همراه مستندات و خروجی‌های فاز پس از تأیید ناظر ارائه می‌شود (بند ۹-۲ قرارداد). موارد نیازمند اصلاح با ذکر دلیل اعلام و پس از رفع، مجدداً ارائه می‌شود. هرگونه تغییر در اقلام پیوست فنی با پیشنهاد کتبی و تأیید ناظر انجام می‌شود (بند ۱۰-۲).</p>
</div>

<div class="section"><h2><span class="sec">۲</span>فاز اول — شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه</h2>
<h3>فاز اول انجام‌شده است وقتی:</h3>{pdod(1)}{h1}</div>
<div class="section"><h2><span class="sec">۳</span>فاز دوم — توسعه‌ی دسته‌ی اول افزونه‌های جدید</h2>
<h3>فاز دوم انجام‌شده است وقتی:</h3>{pdod(2)}{h2}</div>
<div class="section"><h2><span class="sec">۴</span>فاز سوم — توسعه‌ی دسته‌ی دوم افزونه‌های جدید</h2>
<h3>فاز سوم انجام‌شده است وقتی:</h3>{pdod(3)}
<p class="small">یادداشت: در جدول فاز سوم پیوست فنی، اقلام «مدیریت پروژه» ذیل عنوان «مدیریت دانش» درج شده‌اند. در این سند با عنوان «مدیریت پروژه» آمده‌اند و پیشنهاد می‌شود این اصلاح عنوان طی صورتجلسه تأیید شود.</p>
{h3}</div>
<div class="section"><h2><span class="sec">۵</span>تحویل و پذیرش نهایی پروژه</h2>
{grid(DELIVERY, ["مرحله", "مبنا", "انجام‌شده یعنی"])}
<div class="sign"><div>مالک محصول — مجری</div><div>ناظر محترم کارفرما</div></div></div>
</body></html>"""

(WORK / "dod3.html").write_text(HTML, encoding="utf-8")
subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={OUT}", "--allow-file-access-from-files", f"file://{WORK / 'dod3.html'}"],
               check=True, capture_output=True)
print(OUT, n1, n2, n3)
