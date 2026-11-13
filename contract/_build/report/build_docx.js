// Word version of the technical progress report (same data as the PDF: report.json)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, ImageRun, BorderStyle, PageBreak, Footer, PageNumber, LevelFormat,
} = require('docx');

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8'));
const L = D.label;
const OUT = '/home/ubuntu/projects/Motoshub/contract/گزارش-پیشرفت-فنی-فاز-۱-و-۲.docx';
const FONT = 'Tahoma';
const fa = s => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const COLORS = { op: { fill: 'E6F4EC', color: '16794C' }, dev: { fill: 'E8EEFC', color: '1F4FD1' }, wip: { fill: 'FFF4E0', color: '9A6200' } };
const INK = '14213D', LINE = 'D9DEE7', SOFT = 'F3F5F9';

const run = (t, o = {}) => new TextRun({ text: t, font: FONT, rightToLeft: true, size: o.size || 20, bold: o.bold, color: o.color });
const para = (t, o = {}) => new Paragraph({
  bidirectional: true, alignment: o.align || AlignmentType.START, spacing: { after: o.after ?? 120, line: 300 },
  heading: o.heading, children: Array.isArray(t) ? t : [run(t, o)],
});
const h1 = t => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK, space: 4 } }, children: [run(t, { size: 30, bold: true, color: INK })] });
const h2 = t => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
  children: [run(t, { size: 24, bold: true, color: INK })] });

const TW = 9638; // A4 text width in DXA with 2cm margins
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(content, w, o = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map(x => typeof x === 'string'
    ? para(x, { size: o.size || 18, bold: o.bold, color: o.color, after: 0, align: o.align }) : x);
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: kids });
}
function table(widths, header, rows) {
  const hdr = new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { fill: INK, color: 'FFFFFF', bold: true, size: 18 })) });
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, visuallyRightToLeft: true,
    rows: [hdr, ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => (c instanceof TableCell) ? c : cell(c, widths[i])) }))] });
}
const stCell = (s, w) => cell(L[s], w, { fill: COLORS[s].fill, color: COLORS[s].color, bold: true, size: 16, align: AlignmentType.CENTER });

function img(file, w, h, caption) {
  const data = fs.readFileSync(path.join(__dirname, 'fig', file));
  return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new ImageRun({ type: 'jpg', data, transformation: { width: w, height: h } })] }),
    para(caption, { size: 16, color: '5B6578', align: AlignmentType.CENTER, after: 160 })];
}
function imgRow(files, w, h) {
  const cw = Math.floor(TW / files.length);
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: files.map(() => cw), visuallyRightToLeft: true,
    rows: [new TableRow({ children: files.map(([f, c]) => new TableCell({ width: { size: cw, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: img(f, w, h, c) })) })] });
}

const cnt = c => `${fa(c.op + c.dev + c.wip)} قلم: ${L.op} ${fa(c.op)} · ${L.dev} ${fa(c.dev)} · ${L.wip} ${fa(c.wip)} — پیاده‌سازی‌شده ${fa(c.op + c.dev)} قلم (${fa(Math.round(100 * (c.op + c.dev) / (c.op + c.dev + c.wip)))}٪)`;

function phase(cats, tag) {
  const out = [];
  cats.forEach((c, ci) => {
    const k = { op: 0, dev: 0, wip: 0 }; c.items.forEach(it => k[it.s]++);
    out.push(h2(`${fa(ci + 1)}. ${c.cat}`));
    out.push(para([run('کار انجام‌شده: ', { bold: true, color: '16794C', size: 19 }), run(c.desc, { size: 19 })]));
    out.push(table([1300, 6538, 1800], ['کد', 'قلم قرارداد', 'وضعیت'],
      c.items.map((it, ii) => [fa(`${tag}.${ci + 1}.${ii + 1}`), it.t, stCell(it.s, 1800)])));
    out.push(para('', { after: 60 }));
  });
  return out;
}

const c1 = D.p1_count, c2 = D.p2_count;
const children = [
  para('پروژه‌ی استقرار و توسعه‌ی شبکه‌ی اجتماعی دانشمند (موتوشاب سازمانی)', { size: 20, bold: true, color: '1F4FD1', after: 400 }),
  para('گزارش پیشرفت فنی', { size: 52, bold: true, color: INK, after: 60 }),
  para('فاز اول و فاز دوم', { size: 44, bold: true, color: INK, after: 200 }),
  para('شرح کارهای انجام‌شده، وضعیت اقلام پیوست فنی و محیط‌های تحویل‌شده', { size: 24, color: '5B6578', after: 600 }),
  table([2600, 7038], ['مشخصه', 'شرح'], [
    ['کارفرما', 'هلدینگ تحقیق و توسعه دانشمند — بنیاد مستضعفان انقلاب اسلامی'],
    ['مجری', 'شرکت دانش افراز فاخر ایرانیان'],
    ['تهیه‌کننده', 'مالک محصول (Product Owner) پروژه'],
    ['شماره و تاریخ', `گزارش شماره‌ی ${fa(1)} — ${fa('1405/07/18')}`],
    ['مبنا', 'قرارداد و پیوست فنی شماره‌ی یک؛ معیارهای پذیرش در سند «تعریف انجام‌شده و معیارهای پذیرش فازهای پروژه»'],
  ]),
  new Paragraph({ children: [new PageBreak()] }),

  h1('۱. خلاصه‌ی گزارش'),
  para('در این دوره، نسخه‌ی پایه‌ی موتوشاب بر اساس ساختار و نیازهای هلدینگ دانشمند پیکربندی و شخصی‌سازی شد و به‌صورت سامانه‌ی وب و اپلیکیشن اندروید «دانشمند» در اختیار کاربران قرار گرفت. هر دو بر سرویس‌های شبکه‌ی اجتماعی موتوشاب (Social API نسخه‌ی ۱) و سرویس هویت و دسترسی کار می‌کنند. هم‌زمان، نسخه‌ی جدید رابط کاربری با تمرکز بر تجربه‌ی کاربری سازمانی توسعه یافت. امکانات فاز دوم (پروفایل کاربران، مدیریت دانش و جستجوی پیشرفته) در این نسخه پیاده‌سازی شده و انتقال آن به نسخه‌ی عملیاتی در جریان است.'),
  table([1800, 7838], ['وضعیت', 'معنا'], [
    [stCell('op', 1800), 'در سامانه‌ی وب یا اپلیکیشن در دسترس کاربران است'],
    [stCell('dev', 1800), 'در نسخه‌ی جدید رابط کاربری پیاده‌سازی و قابل ارائه است؛ انتقال آن به نسخه‌ی عملیاتی در جریان است'],
    [stCell('wip', 1800), 'در برنامه‌ی تکمیل'],
  ]),
  para('', { after: 80 }),
  table([3600, 6038], ['فاز', 'وضعیت اقلام'], [
    ['فاز اول — شخصی‌سازی، پیکربندی و استقرار نسخه‌ی پایه', cnt(c1)],
    ['فاز دوم — توسعه‌ی دسته‌ی اول افزونه‌های جدید', cnt(c2)],
  ]),
  h2('محیط‌ها و اجزای تحویل‌شده'),
  table([2000, 2200, 3838, 1600], ['جزء', 'نشانی / نسخه', 'شرح فنی', 'وضعیت'],
    D.envs.map(([a, b, c, s]) => [a, b, c, stCell(s, 1600)])),

  h1('۲. معماری و زیرساخت فنی'),
  table([2400, 7238], ['لایه', 'شرح'], [
    ['لایه‌ی سرویس', 'سرویس‌های REST با مستندات OpenAPI 3؛ ماژول‌های محتوا (خبر، بلاگ، مجله)، رویداد، انجمن، رسانه، پیام‌رسانی (گفتگو، گروه، کانال، بات)، ارتباطات و هسته (برچسب، دسته‌بندی، نظر، واکنش، مدیریت فایل، تنظیمات)؛ درگاه واحد API برای وب و اپلیکیشن'],
    ['هویت و دسترسی', 'ساختار سازمانی لایه‌ای سیستم ← هلدینگ ← شرکت ← واحد، نقش‌های سفارشی با مجوزهای ریز، دایرکتوری اعضای سازمان، ثبت‌نام با کد ملی، کد پرسنلی و شماره‌ی موبایل'],
    ['سامانه‌ی وب', 'Next.js، راست‌چین؛ وب‌سایت عمومی (اخبار، رسانه، رویدادها، وبلاگ، مجلات، پرسش و پاسخ)، حالت روشن/تیره و فضای کاری (اسناد، پروژه‌ها، گزارش‌ها، کاربران، تنظیمات)'],
    ['اپلیکیشن اندروید', 'اپلیکیشن «دانشمند» با برند هلدینگ؛ صفحه‌ی عمومی، ورود و ثبت‌نام، داشبورد فعالیت‌ها، اخبار با فیلتر و دسته‌بندی، مجلات، رسانه، رویدادها، پرسش و پاسخ، اعضای سازمان، جستجو و اعلان‌ها'],
    ['نسخه‌ی جدید رابط کاربری', 'React و TypeScript؛ منطبق بر قرارداد سرویس‌های API؛ مدل دسترسی لایه‌ای، مرکز راهنمای درون‌برنامه (۴۴ مقاله)، نسخه‌ی قابل نصب وب (PWA)'],
    ['مستندات فنی', 'مستندات OpenAPI سرویس‌ها، مدل هویت و دسترسی، نگاشت مجوزها، مدل داده‌ی مدیریت دانش، نگاشت رابط کاربری به سرویس‌های API، رویدادها و اعلان‌های مدیریت پروژه'],
  ]),
  h2('تصاویر اپلیکیشن اندروید «دانشمند»'),
  imgRow([['app_landing.jpg', 'صفحه‌ی عمومی'], ['app_login.jpg', 'ورود به سامانه'], ['app_dashboard.jpg', 'داشبورد فعالیت‌های من']], 170, 368),
  imgRow([['app_news.jpg', 'اخبار سازمان'], ['app_magazines.jpg', 'مجلات'], ['app_menu.jpg', 'منوی بخش عمومی']], 170, 368),
  h2('تصاویر سامانه‌ی وب'),
  ...img('web_home.jpg', 600, 375, 'صفحه‌ی اصلی سامانه‌ی وب'),
  ...img('web_register.jpg', 600, 375, 'ثبت‌نام کاربران'),
  new Paragraph({ children: [new PageBreak()] }),

  h1('۳. فاز اول — شرح کار و وضعیت اقلام'),
  ...phase(D.p1, 1),
  new Paragraph({ children: [new PageBreak()] }),
  h1('۴. فاز دوم — شرح کار و وضعیت اقلام'),
  ...phase(D.p2, 2),
  h2('تصاویر نسخه‌ی جدید رابط کاربری — امکانات فاز دوم'),
  ...img('demo_knowledge.jpg', 600, 375, 'داشبورد مدیریت دانش'),
  ...img('demo_kmsearch.jpg', 600, 375, 'جستجوی پیشرفته‌ی دانش'),
  ...img('demo_profile.jpg', 600, 375, 'پروفایل کاربر'),
  ...img('demo_roles.jpg', 600, 375, 'نقش‌ها و مجوزها'),

  h1('۵. دستاوردهای فراتر از اقلام فاز اول و دوم'),
  para('علاوه بر اقلام پیوست فنی، امکانات زیر در نسخه‌ی جدید رابط کاربری توسعه یافته است. بخشی از آن‌ها پیشرفت زودهنگام اقلام فاز سوم است.'),
  table([2800, 6838], ['حوزه', 'شرح'], D.extra),
  ...img('demo_dashboard.jpg', 600, 375, 'میز کار شخصی'),

  h1('۶. برنامه‌ی تکمیل'),
  para('اقلام زیر در گام بعد تکمیل می‌شوند. ستون «توسعه‌یافته» اقلامی است که پیاده‌سازی شده و منتقل‌کردن آن‌ها به نسخه‌ی عملیاتی باقی مانده است. ستون «در حال تکمیل» اقلامی است که توسعه‌ی آن‌ها در برنامه است.'),
  table([700, 2300, 3319, 3319], ['فاز', 'بخش', `${L.dev} — انتقال به نسخه‌ی عملیاتی`, L.wip],
    [['۱', D.p1], ['۲', D.p2]].flatMap(([ph, cats]) => cats.map(c => {
      const d = c.items.filter(i => i.s === 'dev').map(i => i.t), w = c.items.filter(i => i.s === 'wip').map(i => i.t);
      if (!d.length && !w.length) return null;
      const lines = arr => arr.length ? arr.map(t => para(t, { size: 16, after: 20 })) : [para('—', { size: 16, after: 0 })];
      return [ph, c.cat, cell(lines(d), 3319), cell(lines(w), 3319)];
    })).filter(Boolean)),
  h2('درخواست'),
  para('خواهشمند است خروجی‌های این گزارش بر اساس معیارهای پذیرش مصوب بررسی شود و نتیجه یا اصلاحات لازم اعلام گردد. نمایش زنده‌ی سامانه‌ی وب، اپلیکیشن و نسخه‌ی جدید رابط کاربری در جلسه‌ی بازبینی با حضور ناظر محترم قابل انجام است.'),
  table([4819, 4819], ['مالک محصول — مجری', 'ناظر محترم کارفرما'], [[
    cell([para('', { after: 600 })], 4819), cell([para('', { after: 600 })], 4819)]]),
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
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log(OUT, b.length); });
