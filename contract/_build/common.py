# -*- coding: utf-8 -*-
import pathlib
FONTS = pathlib.Path("/home/ubuntu/projects/Motoshub/brand/fonts")
PHASE1 = [
    ("گروه‌های تعاملی", "ص۱۳",
     "روی نسخه‌ی مستقر: یک گروه عمومی، یک گروه خصوصی و یک زیرگروه ساخته و مدیریت (ویرایش/حذف/جابجایی) شود.",
     ["ایجاد گروه‌های خصوصی و عمومی", "ایجاد و مدیریت زیرگروه‌ها"], []),
    ("ایجاد محتوا در قالب پست", "ص۱۳",
     "پست با پیوست چند قالب فایل منتشر شود؛ پیش‌نمایش تصویر/ویدیو و پیش‌نمایش لینک دیده شود؛ لایک، کامنت و پین کار کند.",
     ["درج فایل با قالب‌های مختلف", "پیش‌نمایش قالب‌های مرسوم تصویری و چندرسانه‌ای در پست",
      "پسندیدن (Like) پست‌ها توسط اعضا", "پاسخ‌دادن به پست‌ها (Comment)", "برجسته‌سازی (Pin) پست‌ها",
      "پیش‌نمایش اطلاعات نشانی‌های اینترنتی اشتراک‌گذاشته‌شده (Prefetching)"], [5]),
    ("ایجاد نظرسنجی به صورت چند یا تک گزینه‌ای", "ص۱۳",
     "نظرسنجی تک‌گزینه‌ای و چندگزینه‌ای (با رسانه) ساخته، پاسخ داده و نتیجه‌ی لحظه‌ای دیده شود؛ مدیر پاسخ‌ها را مدیریت کند.",
     ["پشتیبانی از محتوای چندرسانه‌ای", "پشتیبانی از نظرسنجی‌های چندگزینه‌ای", "پشتیبانی از نظرسنجی‌های تک‌گزینه‌ای",
      "مدیریت پاسخ‌های نظرسنجی", "نمایش لحظه‌ای نظرسنجی", "امکان ایجاد نظر"], [0, 1, 2, 3, 4, 5]),
    ("تعامل با دیگر کاربران", "ص۱۳–۱۴",
     "Join/Follow، دعوت، اعلان، خبرخوان (RSS)، اسناد و تالار گروه، راهبر گروه، گروه‌کانال، دسته‌بندی، شمارنده‌ی ناخوانده و گزارش تخلف همه روی نسخه‌ی مستقر نمایش داده شود.",
     ["عضویت در گروه‌ها (Join) و یا دنبال‌کردن محتوای آن‌ها (Follow)", "دعوت از دیگر کاربران شبکه برای عضویت در گروه",
      "ثبت فعالیت‌های اعضای گروه در داشبورد شبکه", "ایجاد و ارسال اعلان مرتبط با پست‌ها و فعالیت‌های کاربران",
      "اتصال خبرخوان‌های متعدد", "مدیریت اسناد گروه", "ایجاد تالارهای گفتگو (Forum) پیرامون هر گروه",
      "تعیین راهبران (Admin) گروه", "امکان ایجاد گروه از جنس کانال‌های اطلاع‌رسانی", "امکان دسته‌بندی گروه‌ها",
      "مشاهده تعداد پست ناخوانده هر گروه", "گزارش تخلف بر روی گروه و پست‌های آن"], [4]),
    ("امکان درج هشتگ", "ص۱۴",
     "روی همه‌ی انواع محتوا برچسب زده شود، ابر هشتگ نمایش داده شود و جستجو با برچسب نتیجه بدهد.",
     ["امکان برچسب‌گذاری بر روی تمامی محتوا", "نمایش ابری هشتگ‌ها", "پشتیبانی از جستجوی محتوا با برچسب"], []),
    ("اشاره به کاربران (Mention)", "ص۱۴",
     "هنگام تایپ @ پیشنهاد لحظه‌ای افراد بیاید و فرد اشاره‌شده اعلان بگیرد.",
     ["پشتیبانی از اشاره به دیگر کاربران", "ارسال اعلان برای افراد اشاره‌شده",
      "نمایش لحظه‌ای پیشنهادی افراد در زمان نوشتن"], []),
    ("گپ‌زدن (Chat)", "ص۱۴",
     "گفتگوی متنی برخط و آفلاین، ارسال فایل/رسانه، فهرست کاربران با جستجو و نشانگر برخط کار کند.",
     ["گپ و گفت‌وگوی متنی (برخط و غیربرخط)", "اشتراک‌گذاری محتوای متنی، چندرسانه‌ای و فایل‌های مختلف",
      "مشاهده فهرست کاربران با امکان جستجو", "مشاهده کاربران برخط (Online)"], []),
    ("مدیریت رویدادها و جلسات", "ص۱۴",
     "رویداد با زمان/مکان منتشر، دعوت ارسال، محتوا/نظر/سند/هشتگ درج و اعلان آن در داشبورد دیده شود؛ تقویم شمسی و میلادی.",
     ["انتشار رویداد شامل زمان و مکان آن", "دعوت از کاربران برای مشارکت", "ایجاد محتوا", "درج نظر", "مدیریت اسناد",
      "اطلاع‌رسانی رویداد از طریق داشبورد و اعلان‌ها", "هشتگ", "پشتیبانی از تقویم شمسی و میلادی"], []),
    ("داشبورد فعالیت‌ها", "ص۱۴–۱۵",
     "هر کاربر داشبورد اختصاصی با تجمیع فعالیت گروه/انجمن/رویداد داشته باشد و از همان‌جا پست عمومی (با هشتگ، منشن، نظرسنجی و تنظیم حریم خصوصی) منتشر کند.",
     ["ایجاد داشبورد اختصاصی برای هر کاربر", "مشاهده تجمیع فعالیت‌های مرتبط با کاربر",
      "محتوای گروه‌های تعاملی، فعالیت‌های انجمن، رویدادها و غیره", "ایجاد و اشتراک‌گذاری محتوای عمومی در قالب پست",
      "دارای تمامی امکانات پست‌های گروه", "هشتگ، اشاره به کاربران، نظرسنجی", "مدیریت حریم خصوصی محتوا"], [5]),
    ("اخبار", "ص۱۵",
     "مدیر خبر چندرسانه‌ای منتشر کند، همه‌ی کاربران مطلع شوند و نظرات خبر مدیریت شود.",
     ["مدیریت اخبار عمومی شبکه", "پشتیبانی از محتوای چندرسانه‌ای", "اطلاع‌رسانی به تمامی کاربران", "مدیریت نظرات"], []),
    ("ویدیو", "ص۱۵",
     "بارگذاری MP4 و AVI، درج ویدیو از آپارات، حریم خصوصی، نظر، امتیاز و برچسب روی ویدیو کار کند.",
     ["پشتیبانی از ویدیوها در فرمت‌های مرسوم مانند MP4 و AVI", "اتصال به شبکه آپارات",
      "پشتیبانی از تنظیمات حریم خصوصی", "مدیریت نظرات", "امکان امتیازدهی و برچسب‌گذاری ویدیوها"], [0, 1]),
    ("تصاویر", "ص۱۵",
     "بارگذاری PNG/JPG، آلبوم کاربر، حریم خصوصی، نظر، امتیاز و برچسب روی تصویر کار کند.",
     ["پشتیبانی از تصاویر در فرمت مرسوم مانند PNG و JPG", "مدیریت آلبوم‌های کاربری",
      "پشتیبانی از تنظیمات حریم خصوصی", "مدیریت نظرات", "پشتیبانی از امتیازدهی و برچسب‌گذاری"], []),
    ("انجمن", "ص۱۵",
     "تالار و موضوع ساخته شود، پرسش‌وپاسخ، دنبال‌کردن موضوع و نمایش آن در داشبورد، جمع‌بندی موضوع و گزارش عملکرد موضوعات قابل نمایش باشد.",
     ["تبادل اطلاعات توسط کاربران با یکدیگر در قالب موضوعات مختلف", "امکان دسته‌بندی موضوعات در قالب تالارها",
      "مدیریت موضوعات", "پرسش و پاسخ ذیل هر موضوع", "دنبال‌کردن موضوعات",
      "مشاهده فعالیت‌های موضوعات دنبال‌شده در داشبورد", "امکان جمع‌بندی موضوعات",
      "امکان ایجاد گزارش عملکرد از موضوعات"], [6, 7]),
    ("ارسال اعلان", "ص۱۵",
     "اعلان برخط و ایمیل (رایانامه) واقعاً ارسال شود و کاربر بتواند برای هر نوع فعالیت اعلان را روشن/خاموش کند.",
     ["اعلان و اطلاع‌رسانی به صورت برخط و رایانامه", "مدیریت اعلان تمامی فعالیت‌ها توسط کاربران"], [0]),
    ("بلاگ", "ص۱۵",
     "کاربر بلاگ بسازد، برچسب/هشتگ بزند و دیگران امتیاز بدهند.",
     ["امکان ایجاد بلاگ توسط کاربران شبکه", "امکان برچسب‌گذاری بلاگ‌ها و استفاده از هشتگ",
      "امکان امتیازدهی به بلاگ‌ها توسط سایر اعضای شبکه"], []),
    ("مدیریت نشست‌ها", "ص۱۶",
     "کاربر آخرین ورودهای موفق (با جزئیات IP/دستگاه/زمان) و نشست‌های فعال را ببیند و نشست را منقضی کند.",
     ["پشتیبانی از نمایش آخرین ورودهای موفق با جزئیات", "پشتیبانی از نمایش تمامی نشست‌های فعال",
      "پشتیبانی از منقضی‌کردن نشست‌های فعال"], []),
    ("مکانیزم‌های مختلف عضویت در شبکه", "ص۱۶",
     "ثبت‌نام/ورود با نام کاربری‌وگذرواژه و با شماره موبایل (OTP پیامکی) روی نسخه‌ی مستقر کار کند.",
     ["ورود و عضویت از طریق نام‌کاربری و گذرواژه", "ورود و عضویت با شماره تلفن همراه"], [1]),
    ("دوستی و ایجاد ارتباطات", "ص۱۶",
     "درخواست ارتباط، دنبال‌کردن، نمایش محتوا طبق حریم خصوصی و «کاربر برجسته + دوستی خودکار» قابل نمایش باشد.",
     ["امکان برقراری ارتباط با دیگر مخاطبان", "مشاهده محتوای عمومی تمامی کاربران",
      "مشاهده محتوای مخاطبان بر اساس حریم خصوصی", "امکان ارسال درخواست اضافه شدن به فهرست مخاطبین",
      "امکان دنبال‌کردن مخاطبان به منظور نمایش محتوای آن‌ها در بخش داشبورد",
      "مشخص کردن کاربران برجسته و دوستی خودکار اعضای شبکه با کاربران از پیش تعریف شده"], [5]),
    ("امکانات مختلف امنیتی", "ص۱۶",
     "Rate-limit و سقف درخواست در بازه‌ی زمانی، مسدودسازی (دستی/خودکار، با زمان‌بندی)، کپچای قابل‌تنظیم، لینک امن فایل و اسکن ClamAV (رد فایل آلوده + اطلاع به کاربر + اسکن دوره‌ای) با تست مستند اثبات شود.",
     ["محدودکننده تعداد درخواست‌های کاربران",
      "تعیین تعداد درخواست‌های مجاز کاربران در بازه زمانی خاص به منظور جلوگیری از تولید محتوای عظیم توسط برخی کاربر ناهنجار",
      "مسدودسازی کاربران ناهنجار", "مدیریت نمایش کپچا در فرم احراز هویت",
      "مدیریت زمان و چگونگی مسدودسازی کاربران ناهنجار", "امن‌سازی پیوندهای فایل",
      "استفاده از ابزار ضد ویروس ClamAV جهت اسکن فایل‌های ضمیمه شده",
      "عدم ذخیره فایل‌های ویروسی و اطلاع‌رسانی به کاربر", "بررسی دوره‌ای تمامی فایل‌های میزبان"], [6, 7, 8]),
    ("امکانات کامل راهبری شبکه اجتماعی سازمانی", "ص۱۶–۱۷",
     "پنل راهبری برای صفحات، منو، افزونه، لاگ، نقش، ناظم، زبان، پسوندهای مجاز، کاربران و ورود دسته‌ای از اکسل در دسترس مدیر کارفرما باشد.",
     ["مدیریت صفحات", "مدیریت منوها", "مدیریت افزونه‌ها", "مدیریت لاگ‌نویسی", "مدیریت نقش‌ها", "مدیریت ناظم‌ها",
      "مدیریت زبان‌ها", "مدیریت پسوندهای مجاز محتوای چندرسانه‌ای", "مدیریت کاربران و نمایه آن‌ها",
      "واردسازی کاربران به صورت دسته‌ای", "امکان واردسازی کاربران از طریق اکسل"], [10]),
    ("دیگر امکانات", "ص۱۷",
     "هر قلم روی نسخه‌ی مستقر قابل نمایش باشد؛ «راهنمای کامل کاربری و راهبری» به‌صورت سند تحویل شود و «نسخه‌ی اندروید» به‌صورت فایل نصبی (APK) یا لینک مارکت تحویل شود.",
     ["راهنمای کامل کاربری و راهبری", "قابلیت گزارش‌گیری از تمام قسمت‌های موتوشاب",
      "پشتیبانی از تقویم شمسی و میلادی", "مدیریت اسلایدشو", "عکس سرصفحه", "راهنمای تعاملی برخط",
      "پیشنهاد کاربران به منظور برقراری ارتباط", "ویرایشگر پیشرفته متن", "اوقات شرعی تمامی شهرهای ایران",
      "زیرساخت مدیریت فایل‌ها و متن با قابلیت دسته‌بندی (مدیریت دانش، مستندات آموزشی، آرشیو قراردادها و...)",
      "قابلیت جستجوی پیشرفته", "نسخه اندروید"], [0, 1, 8, 11]),
]


font_face = "".join(
    f"@font-face{{font-family:'Sahel FD';src:url('file://{FONTS}/{f}') format('woff2');font-weight:{w};}}"
    for f, w in [("Sahel-Light-FD.woff2", 300), ("Sahel-FD.woff2", 400), ("Sahel-SemiBold-FD.woff2", 600),
                 ("Sahel-Bold-FD.woff2", 700), ("Sahel-Black-FD.woff2", 900)])

CSS = font_face + """
@page{size:A4;margin:16mm 15mm 16mm 15mm;
  @bottom-center{content:counter(page);font:9pt 'Sahel FD';color:#8a94a6}}
:root{--ink:#14213d;--muted:#5b6578;--line:#d9dee7;--soft:#f3f5f9;--accent:#1f4fd1;--accent-soft:#e8eefc;
  --red:#b42318;--red-soft:#fdecea;--amber:#9a6200;--amber-soft:#fff4e0;--green:#16794c;--green-soft:#e6f4ec}
*{box-sizing:border-box}
html{direction:rtl}
body{font-family:'Sahel FD',sans-serif;color:var(--ink);font-size:10pt;line-height:1.75;margin:0;background:#fff}
h1,h2,h3{margin:0;font-weight:800}
h2{font-size:15pt;color:var(--ink);border-bottom:2px solid var(--ink);padding-bottom:4px;margin:0 0 10px;break-after:avoid}
h2 .sec{color:var(--accent);margin-left:6px}
h3{font-size:11.5pt;margin:14px 0 6px;break-after:avoid}
p{margin:0 0 8px}
.section{break-before:page}
.cover{height:262mm;display:flex;flex-direction:column;justify-content:space-between;padding:6mm 0}
.cover .kicker{font-size:10pt;color:var(--accent);font-weight:700;letter-spacing:0}
.cover h1{font-size:26pt;line-height:1.45;margin:10px 0 8px}
.cover .sub{font-size:12.5pt;color:var(--muted)}
.cover .bar{height:6px;background:var(--ink);width:70mm;margin:18px 0}
.meta{display:grid;grid-template-columns:38mm 1fr;gap:4px 10px;font-size:10pt;border-top:1px solid var(--line);padding-top:12px}
.meta div:nth-child(odd){color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 14px}
.kpi{border:1px solid var(--line);border-radius:6px;padding:8px 10px;background:var(--soft)}
.kpi .v{font-size:15pt;font-weight:900;line-height:1.3}
.kpi .l{font-size:8.5pt;color:var(--muted)}
.call{border-right:4px solid var(--accent);background:var(--accent-soft);padding:8px 12px;border-radius:4px;margin:8px 0 12px}
.call.red{border-color:var(--red);background:var(--red-soft)}
.call.amber{border-color:var(--amber);background:var(--amber-soft)}
.call b{font-weight:800}
ol.find{margin:0;padding-right:18px}
ol.find li{margin-bottom:5px}
table{border-collapse:collapse;width:100%}
.grid th,.grid td{border:1px solid var(--line);padding:5px 7px;vertical-align:top;text-align:right}
.grid th{background:var(--ink);color:#fff;font-weight:700;font-size:9pt}
.grid td{font-size:9.2pt}
.grid tr{break-inside:avoid}
.grid .b{font-weight:700}
.grid .ref{white-space:nowrap;color:var(--accent);font-weight:700;font-size:8.5pt}
.grid tr.hl td{background:var(--green-soft)}
.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.facts td:first-child{width:42mm;color:var(--muted);background:var(--soft)}
.cat{border:1px solid var(--line);border-radius:6px;margin:0 0 9px;break-inside:avoid;overflow:hidden}
.cat-h{display:flex;align-items:center;gap:8px;background:var(--soft);padding:5px 9px;border-bottom:1px solid var(--line)}
.cat-n{background:var(--ink);color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:8.5pt;font-weight:700}
.cat-t{font-weight:800;font-size:10.5pt}
.cat-p{margin-right:auto;color:var(--muted);font-size:8.5pt}
.crit{padding:5px 10px;font-size:9pt;background:#fff;border-bottom:1px dashed var(--line)}
.crit b{color:var(--green)}
.items th{font-size:8pt;color:var(--muted);font-weight:600;text-align:right;padding:3px 6px;border-bottom:1px solid var(--line)}
.items td{padding:3px 6px;font-size:9.2pt;border-bottom:1px solid #eef1f5;vertical-align:top}
.items tr:last-child td{border-bottom:0}
.items .num{color:var(--muted);font-size:8.3pt}
.items .box,.box{color:var(--muted);font-size:11pt;line-height:1.4}
.items .ev{border-right:1px dashed var(--line)}
.flag{display:inline-block;font-size:7.5pt;font-weight:700;color:var(--amber);background:var(--amber-soft);border-radius:3px;padding:0 5px;margin-right:4px}
.risk{display:grid;grid-template-columns:16mm 1fr;gap:8px;border:1px solid var(--line);border-radius:6px;padding:7px 9px;margin-bottom:7px;break-inside:avoid}
.risk .rk{font-weight:800;font-size:8.5pt;text-align:center;border-radius:4px;padding:2px 0;align-self:start}
.risk.high .rk{background:var(--red-soft);color:var(--red)}
.risk.mid .rk{background:var(--amber-soft);color:var(--amber)}
.risk.low .rk{background:var(--soft);color:var(--muted)}
.rt{font-weight:800;font-size:10pt}
.rd{font-size:9.2pt;color:#2b3550}
ul.ev{list-style:none;padding:0;margin:0;columns:1}
ul.ev li{padding:4px 0;border-bottom:1px solid #eef1f5;font-size:9.6pt}
.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin:8px 0 14px}
.step{border:1px solid var(--line);padding:7px 8px;font-size:8.8pt;position:relative;background:#fff}
.step:not(:last-child){border-left:0}
.step b{display:block;font-size:9.5pt;margin-bottom:2px}
.step .t{color:var(--muted);font-size:8pt}
.step.on{background:var(--green-soft)}
.small{font-size:8.6pt;color:var(--muted)}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.sign div{border:1px solid var(--line);border-radius:6px;height:26mm;padding:6px 10px;font-size:9pt;color:var(--muted)}
"""

