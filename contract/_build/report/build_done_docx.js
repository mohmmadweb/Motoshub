// Word version of «گزارش پیشرفت فنی فاز ۱ و ۲ — اقلام تحویل‌شده» (same data as build_done.py → done.json)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, ImageRun, BorderStyle, PageBreak, Footer, PageNumber,
} = require('docx');

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'done.json'), 'utf8'));
const OUT = '/home/ubuntu/projects/Motoshub/contract/گزارش-پیشرفت-فنی-فاز-۱-و-۲-اقلام-تحویل‌شده.docx';
const FONT = 'Tahoma';
const fa = s => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const INK = '14213D', LINE = 'D9DEE7', MUTED = '5B6578';
const ST = { op: { t: 'عملیاتی', fill: 'E6F4EC', color: '16794C' }, dev: { t: 'پیاده‌سازی‌شده', fill: 'E8EEFC', color: '1F4FD1' } };
const ENV = { op: 'وب و اپلیکیشن', dev: 'رابط کاربری جدید' };

const run = (t, o = {}) => new TextRun({ text: t, font: FONT, rightToLeft: true, size: o.size || 20, bold: o.bold, color: o.color });
const para = (t, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align || AlignmentType.START,
  spacing: { after: o.after ?? 120, line: 300 }, children: Array.isArray(t) ? t : [run(t, o)] });
const h1 = t => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK, space: 4 } }, children: [run(t, { size: 30, bold: true, color: INK })] });
const h2 = t => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
  children: [run(t, { size: 24, bold: true, color: INK })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const TW = 9638;
const b = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: b, bottom: b, left: b, right: b };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
function cell(content, w, o = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map(x => typeof x === 'string'
    ? para(x, { size: o.size || 18, bold: o.bold, color: o.color, after: 0, align: o.align }) : x);
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders: o.noBorder ? { top: none, bottom: none, left: none, right: none } : borders,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: kids });
}
function table(widths, header, rows) {
  const hdr = new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { fill: INK, color: 'FFFFFF', bold: true })) });
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, visuallyRightToLeft: true,
    rows: [hdr, ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => (c instanceof TableCell) ? c : cell(c, widths[i])) }))] });
}
const stCell = (s, w) => cell(ST[s].t, w, { fill: ST[s].fill, color: ST[s].color, bold: true, size: 16, align: AlignmentType.CENTER });
const badge = (t, fill, color, w) => cell(t, w, { fill, color, bold: true, size: 16, align: AlignmentType.CENTER });
const box = (kids, fill) => new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [TW], visuallyRightToLeft: true,
  rows: [new TableRow({ children: [cell(kids, TW, { fill })] })] });

function img(file, w, h, caption) {
  return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new ImageRun({ type: 'jpg', data: fs.readFileSync(path.join(__dirname, 'fig', file)), transformation: { width: w, height: h } })] }),
    para(caption, { size: 16, color: MUTED, align: AlignmentType.CENTER, after: 160 })];
}
function imgRow(files, w, h) {
  const cw = Math.floor(TW / files.length);
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: files.map(() => cw), visuallyRightToLeft: true,
    rows: [new TableRow({ children: files.map(([f, c]) => new TableCell({ width: { size: cw, type: WidthType.DXA },
      borders: { top: none, bottom: none, left: none, right: none }, children: img(f, w, h, c) })) })] });
}

const n1 = D.p1.reduce((a, c) => a + c.items.length, 0);
const n2 = D.p2.reduce((a, c) => a + c.items.length, 0);
const ops = [...D.p1, ...D.p2].reduce((a, c) => a + c.items.filter(i => i.s === 'op').length, 0);

function phase(cats, tag) {
  const out = [];
  for (const c of cats) {
    out.push(h2(`${fa(c.ci)}. ${c.cat}  —  ${fa(c.items.length)} قلم تحویل‌شده`));
    out.push(para([run('کار انجام‌شده: ', { bold: true, color: '16794C', size: 19 }), run(c.desc, { size: 19 })]));
    out.push(table([1100, 5338, 1800, 1400], ['کد', 'قلم قرارداد', 'محیط ارائه', 'وضعیت'],
      c.items.map(it => [fa(`${tag}.${c.ci}.${it.n}`), it.t, ENV[it.s], stCell(it.s, 1400)])));
    out.push(para('', { after: 60 }));
  }
  return out;
}

const ENVS = [
  ['سامانه‌ی وب', 'motonext.shub.ir', 'Next.js، متصل به درگاه API پروژه؛ وب‌سایت عمومی، ثبت‌نام و ورود، فضای کاری کاربران'],
  ['اپلیکیشن اندروید «دانشمند»', 'نسخه‌ی نصبی اندروید', 'داشبورد، اخبار، رسانه، رویدادها و جلسات، مجلات، پرسش و پاسخ، اعضای سازمان، جستجو، اعلان‌ها، ورود و ثبت‌نام'],
  ['سرویس‌های شبکه‌ی اجتماعی', 'Social API v1.0 — api.shub.ir', '۳۲۳ عملیات در ۷ ماژول: محتوا، هسته، رویداد، انجمن، رسانه، پیام‌رسانی، ارتباطات'],
  ['سرویس هویت و دسترسی', 'Identity / IAM', 'ساختار سازمانی لایه‌ای، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضا'],
  ['رابط کاربری جدید', 'demo.shub.ir', 'React و TypeScript، منطبق بر قرارداد سرویس‌های API؛ امکانات تکمیلی فاز اول، امکانات فاز دوم و پیش‌نمایش فاز سوم'],
];
const STEPS = [
  ['تأمین زیرساخت', 'تحویل سرور و تجهیزات شبکه از سوی بنیاد مطابق صورتجلسه‌ی نیازمندی‌های فنی (بند ۲-۲)'],
  ['نصب و پیکربندی', 'نصب سرویس‌ها، پایگاه داده، درگاه API، سامانه‌ی وب و رابط کاربری روی زیرساخت بنیاد (on-premise)؛ پیکربندی دامنه و گواهی امنیتی'],
  ['انتقال و پیکربندی سازمانی', 'انتقال تنظیمات و داده‌های محیط تست، تعریف ساختار سازمانی، نقش‌ها و کاربران'],
  ['تست پذیرش', 'اجرای سناریوهای پذیرش با حضور ناظر بر اساس سند معیارهای پذیرش'],
  ['آموزش و بهره‌برداری آزمایشی', 'کارگاه‌های آموزشی راهبران و کاربران و شروع بهره‌برداری آزمایشی'],
  ['تحویل موقت', 'تنظیم صورتجلسه‌ی تحویل موقت (بند ۱۲-۱)'],
];

const children = [
  para('پروژه‌ی استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند (موتوشاب سازمانی)', { size: 20, bold: true, color: '1F4FD1', after: 400 }),
  para('گزارش پیشرفت فنی', { size: 52, bold: true, color: INK, after: 60 }),
  para('فاز اول و فاز دوم', { size: 44, bold: true, color: INK, after: 200 }),
  para('اقلام تحویل‌شده‌ی پیوست فنی، محیط تست و برنامه‌ی استقرار روی زیرساخت بنیاد', { size: 24, color: MUTED, after: 400 }),
  table([2410, 2410, 2409, 2409], ['تحویل‌شده', 'عملیاتی', 'API', 'بستر'], [[
    `${fa(n1 + n2)} قلم در فاز اول و دوم`, `${fa(ops)} قلم در وب و اپلیکیشن`, '۳۲۳ عملیات در ۷ ماژول', 'وب + اپلیکیشن اندروید «دانشمند»']]),
  para('', { after: 400 }),
  table([2600, 7038], ['مشخصه', 'شرح'], [
    ['کارفرما', 'هلدینگ تحقیق و توسعه دانشمند — بنیاد مستضعفان انقلاب اسلامی'],
    ['مجری', 'شرکت دانش افراز فاخر ایرانیان'],
    ['تهیه‌کننده', 'مالک محصول (Product Owner) پروژه'],
    ['شماره و تاریخ', `گزارش شماره‌ی ${fa(1)} — ${fa('1405/07/18')}`],
    ['مبنا', 'قرارداد و پیوست فنی شماره‌ی یک؛ معیارهای پذیرش در سند «تعریف انجام‌شده و معیارهای پذیرش فازهای پروژه»'],
  ]),
  pageBreak(),

  h1('۱. خلاصه‌ی گزارش'),
  para('نسخه‌ی پایه‌ی موتوشاب بر اساس ساختار و نیازهای هلدینگ دانشمند پیکربندی و شخصی‌سازی شده و به‌صورت سامانه‌ی وب، اپلیکیشن اندروید «دانشمند» و رابط کاربری جدید ارائه شده است. همه‌ی این اجزا بر سرویس‌های شبکه‌ی اجتماعی موتوشاب و سرویس هویت و دسترسی کار می‌کنند. افزونه‌های اختصاصی فاز دوم (پروفایل کاربران، مدیریت دانش و جستجوی پیشرفته) در رابط کاربری جدید پیاده‌سازی شده‌اند. این گزارش اقلامی را شرح می‌دهد که تکمیل شده و روی محیط تست قابل بازدید است؛ اقلام باقی‌مانده در حال پیاده‌سازی است و در گزارش بعدی ارائه می‌شود.'),
  table([1800, 7838], ['وضعیت', 'معنا'], [
    [stCell('op', 1800), 'در سامانه‌ی وب یا اپلیکیشن در دسترس کاربران'],
    [stCell('dev', 1800), 'در رابط کاربری جدید روی محیط تست قابل بازدید؛ اتصال کامل به سرویس‌ها هم‌زمان با استقرار'],
  ]),
  para('', { after: 80 }),
  table([4819, 4819], ['فاز اول — شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه', 'فاز دوم — توسعه‌ی دسته‌ی اول افزونه‌های جدید'], [[
    cell([para(`${fa(n1)} قلم`, { size: 40, bold: true, color: '16794C', after: 0 }), para(`در ${fa(D.p1.length)} بخش`, { size: 18, after: 0 })], 4819, { fill: 'E6F4EC' }),
    cell([para(`${fa(n2)} قلم`, { size: 40, bold: true, color: '16794C', after: 0 }), para(`در ${fa(D.p2.length)} بخش`, { size: 18, after: 0 })], 4819, { fill: 'E6F4EC' }),
  ]]),
  para('', { after: 80 }),
  box([para([run('استقرار: ', { bold: true }), run('برای آنکه تست و بازبینی منتظر تأمین زیرساخت نماند، مطابق بند ۲-۲ قرارداد، سامانه روی دامنه‌ها و سرورهای مجری مستقر شده و برای تست در دسترس است. به‌محض تحویل سرور از سوی بنیاد، استقرار روی زیرساخت بنیاد (on-premise) انجام می‌شود (بخش ۶).')], { after: 0 })], 'E8EEFC'),
  h2('محیط تست و اجزای تحویل‌شده'),
  table([2000, 2300, 3738, 1600], ['جزء', 'نشانی / نسخه', 'شرح فنی', 'وضعیت'],
    ENVS.map(([a, b2, c]) => [a, b2, c, badge('مستقر در محیط تست', 'E8EEFC', '1F4FD1', 1600)])),

  h1('۲. معماری و زیرساخت فنی'),
  table([2400, 7238], ['لایه', 'شرح'], [
    ['لایه‌ی سرویس', 'سرویس‌های REST با مستندات OpenAPI 3؛ ماژول‌های محتوا (خبر، بلاگ، مجله)، رویداد، انجمن، رسانه، پیام‌رسانی (گفتگو، گروه، کانال، بات)، ارتباطات و هسته (برچسب، دسته‌بندی، نظر، واکنش، مدیریت فایل، تنظیمات)؛ درگاه واحد API برای وب و اپلیکیشن'],
    ['هویت و دسترسی', 'ساختار سازمانی لایه‌ای سیستم ← هلدینگ ← شرکت ← واحد، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضای سازمان، ثبت‌نام با کد ملی، کد پرسنلی و شماره‌ی موبایل'],
    ['سامانه‌ی وب', 'Next.js، راست‌چین؛ وب‌سایت عمومی (اخبار، رسانه، رویدادها، وبلاگ، مجلات، پرسش و پاسخ)، حالت روشن/تیره و فضای کاری (اسناد، پروژه‌ها، گزارش‌ها، کاربران، تنظیمات)'],
    ['اپلیکیشن اندروید', 'اپلیکیشن «دانشمند» با برند هلدینگ؛ صفحه‌ی عمومی، ورود و ثبت‌نام، داشبورد فعالیت‌ها، اخبار با فیلتر و دسته‌بندی، مجلات، رسانه، رویدادها، پرسش و پاسخ، اعضای سازمان، جستجو و اعلان‌ها'],
    ['رابط کاربری جدید', 'React و TypeScript؛ منطبق بر قرارداد سرویس‌های API؛ مدل دسترسی لایه‌ای، مرکز راهنمای درون‌برنامه (۴۴ مقاله)، نسخه‌ی قابل نصب وب (PWA)'],
    ['امنیت', 'احراز هویت و ثبت‌نام با اعتبارسنجی، نمایش و خاتمه‌ی نشست‌های فعال، مسدودسازی کاربر، دسترسی احرازشده به فایل‌ها، لاگ ممیزی یکپارچه'],
    ['مستندات فنی', 'مستندات OpenAPI سرویس‌ها، مدل هویت و دسترسی، نگاشت مجوزها، مدل داده‌ی مدیریت دانش، نگاشت رابط کاربری به سرویس‌های API'],
  ]),
  h2('تصاویر اپلیکیشن اندروید «دانشمند»'),
  imgRow([['app_landing.jpg', 'صفحه‌ی عمومی'], ['app_login.jpg', 'ورود به سامانه'], ['app_dashboard.jpg', 'داشبورد فعالیت‌های من']], 170, 368),
  imgRow([['app_news.jpg', 'اخبار سازمان'], ['app_magazines.jpg', 'مجلات'], ['app_menu.jpg', 'منوی بخش عمومی']], 170, 368),
  h2('تصاویر سامانه‌ی وب'),
  ...img('web_home.jpg', 600, 375, 'صفحه‌ی اصلی سامانه‌ی وب'),
  ...img('web_register.jpg', 600, 375, 'ثبت‌نام کاربران'),
  pageBreak(),

  h1('۳. فاز اول — شرح کار و اقلام تحویل‌شده'),
  ...phase(D.p1, 1),
  pageBreak(),
  h1('۴. فاز دوم — شرح کار و اقلام تحویل‌شده'),
  ...phase(D.p2, 2),
  h2('تصاویر رابط کاربری جدید — امکانات فاز دوم'),
  ...img('demo_knowledge.jpg', 600, 375, 'داشبورد مدیریت دانش'),
  ...img('demo_kmsearch.jpg', 600, 375, 'جستجوی پیشرفته‌ی دانش'),
  ...img('demo_profile.jpg', 600, 375, 'پروفایل کاربر'),
  ...img('demo_roles.jpg', 600, 375, 'نقش‌ها و مجوزها'),

  h1('۵. دستاوردهای فراتر از اقلام فاز اول و دوم'),
  para('علاوه بر اقلام پیوست فنی، امکانات زیر در رابط کاربری جدید توسعه یافته است. بخشی از آن‌ها پیشرفت زودهنگام اقلام فاز سوم است.'),
  table([2800, 6838], ['حوزه', 'شرح'], D.extra),
  ...img('demo_dashboard.jpg', 600, 375, 'میز کار شخصی'),
  ...img('demo_access.jpg', 600, 375, 'نقش و دسترسی من'),

  h1('۶. استقرار روی زیرساخت بنیاد'),
  para('طبق بند ۲-۲ قرارداد، تأمین تجهیزات فنی و شبکه با نظارت مجری بر عهده‌ی کارفرماست و در صورت عدم تأمین، مجری سامانه را روی سرور عمومی منتشر و گزارش پیشرفت را بر همین اساس ارائه می‌کند. سامانه اکنون روی محیط تست مجری در دسترس است و پس از تحویل زیرساخت، مراحل زیر انجام می‌شود:'),
  table([700, 2800, 6138], ['#', 'مرحله', 'شرح'], STEPS.map(([a, b2], i) => [fa(i + 1), a, b2])),
  para('', { after: 120 }),
  box([para([run('جمع‌بندی: ', { bold: true, color: '16794C' }), run(`همه‌ی ${fa(n1 + n2)} قلم ارائه‌شده در این گزارش (۱۰۰٪) تکمیل شده و روی محیط تست قابل بازدید است: ${fa(n1)} قلم در فاز اول و ${fa(n2)} قلم در فاز دوم.`)], { after: 0 })], 'E6F4EC'),
  h2('درخواست'),
  para('خواهشمند است اقلام تحویل‌شده در این گزارش بر اساس معیارهای پذیرش مصوب بررسی و نتیجه اعلام گردد. همچنین درخواست می‌شود زیرساخت سخت‌افزاری و شبکه برای استقرار on-premise تأمین و به مجری معرفی شود. نمایش زنده‌ی سامانه‌ی وب، اپلیکیشن و رابط کاربری جدید در جلسه‌ی بازبینی با حضور ناظر محترم قابل انجام است.'),
  table([4819, 4819], ['مالک محصول — مجری', 'ناظر محترم کارفرما'], [[cell([para('', { after: 700 })], 4819), cell([para('', { after: 700 })], 4819)]]),
];

const doc = new Document({
  creator: 'Product Owner', title: 'گزارش پیشرفت فنی فاز اول و دوم',
  styles: { default: { document: { run: { font: FONT, size: 20, rightToLeft: true } } } },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '8A94A6' })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log(OUT, buf.length, n1, n2, ops); });
