# نگاشت مجوزهای دمو ↔ کاتالوگ مجوز بک‌اند Identity

منبع بک‌اند: `GET https://motonext2.shub.ir/api/identity/admin?tenant_id=2` ← `catalogue` (contract_version 3.0) — فقط‌خواندنی دریافت شد (۱۴۰۵/۰۷/۱۰).
کاتالوگ بک‌اند **۵۸ کد** در دو اپلیکیشن دارد: `identity` (۸ کد مدیریت هویت و دسترسی) و `workspace` (۵۰ کد دانش و پروژه).
کد: `src/iam/backendCodes.ts` (`backendMapping(id)`، `backendCodeOf(id)`). در «نقش‌ها و مجوزها» و «نقش و دسترسی من» کنار هر مجوز یک چیپ کوچک کد بک‌اند نشان داده می‌شود
(سبز = معادل کامل، کهربایی با «≈» = معادل ناقص، خط‌چین = بدون کد بک‌اند / سرویس شبکه‌ی اجتماعی).

## خلاصه

| وضعیت | تعداد |
|---|---|
| معادل کامل | ۲۷ |
| معادل ناقص | ۱۴ |
| در سرویس شبکه‌ی اجتماعی (social.shub.ir) | ۳۳ |
| بدون معادل — پیشنهاد افزودن به بک‌اند | ۶۵ |
| **جمع مجوزهای دمو** | **۱۳۹** |

نکته‌ها:
- بک‌اند برای نقش‌ها فقط `identity.iam.role.manage` دارد (ساخت/ویرایش/حذف/مشاهده یکی است)؛ دمو این‌ها را ریزتر کرده است.
- «تأیید هزینه» (`projects.expenses.approve`) در بک‌اند معادل ندارد؛ برای اجرای قاعده‌ی تفکیک وظایف «ثبت هزینه / تأیید هزینه» افزودن `workspace.projects.expense.approve` پیشنهاد می‌شود.
- مجوزهای حاکمیتی موج ۴ (`iam.review.manage`، `iam.impersonate`، سیاست ورود) هنوز در بک‌اند نیستند.

## کدهای بک‌اند بدون مجوز معادل در دمو (۲۶)

| کد بک‌اند | نام |
|---|---|
| `workspace.knowledge.document.add_version` | Add knowledge document versions |
| `workspace.knowledge.profile.delete` | Delete knowledge profiles |
| `workspace.knowledge.profile.view` | View knowledge profiles |
| `workspace.knowledge.research_progress.create` | Create research progress |
| `workspace.knowledge.research_progress.delete` | Delete research progress |
| `workspace.knowledge.research_progress.view` | View research progress |
| `workspace.projects.expense.view` | View project expenses |
| `workspace.projects.meeting.view` | View project meetings |
| `workspace.projects.member.view` | View project members |
| `workspace.projects.milestone.manage` | Manage project milestones |
| `workspace.projects.milestone.view` | View project milestones |
| `workspace.projects.playbook_execution.view` | View playbook executions |
| `workspace.projects.playbook_step.manage` | Manage playbook steps |
| `workspace.projects.playbook_step.view` | View playbook steps |
| `workspace.projects.playbook_template.create` | Create playbook templates |
| `workspace.projects.playbook_template.delete` | Delete playbook templates |
| `workspace.projects.playbook_template.execute` | Execute playbook template |
| `workspace.projects.playbook_template.view` | View playbook templates |
| `workspace.projects.risk.view` | View project risks |
| `workspace.projects.sprint.manage` | Manage sprints |
| `workspace.projects.sprint.view` | View sprints |
| `workspace.projects.task.assign` | Assign project tasks |
| `workspace.projects.task.update` | Update project tasks |
| `workspace.projects.task.view` | View project tasks |
| `workspace.projects.task_dependency.manage` | Manage project task dependencies |
| `workspace.projects.task_dependency.view` | View project task dependencies |

## جدول کامل (بر اساس گروه‌های کاتالوگ دمو)

### ساختار سازمانی و دسترسی‌ها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `iam.structure.view` | مشاهده‌ی ساختار سازمانی | `identity.iam.tenant.view` | معادل کامل |
| `iam.structure.manage` | ایجاد، ویرایش و غیرفعال‌سازی واحدهای زیرمجموعه | `identity.iam.tenant.manage` | معادل کامل |
| `iam.members.manage` | افزودن، تعلیق و فعال‌سازی عضویت‌ها | `identity.iam.membership.manage` | معادل کامل |
| `iam.audit.view` | مشاهده‌ی تاریخچه‌ی تغییرات دسترسی | `identity.iam.audit.view` | معادل کامل |
| `iam.review.manage` | بازبینی دوره‌ای دسترسی‌ها | — | پیشنهاد افزودن به بک‌اند: `identity.iam.access_review.manage` |
| `iam.impersonate` | مشاهده‌ی سامانه از دید کاربر دیگر | — | پیشنهاد افزودن به بک‌اند: `identity.iam.impersonation.start` |

### کاربران

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `users.list` | مشاهده فهرست کاربران | `identity.iam.tenant.view` | معادل ناقص — فهرست کاربران در پاسخ admin همراه tenant.view می‌آید. |
| `users.create` | ایجاد کاربر جدید | `identity.iam.membership.manage` | معادل ناقص — ساخت کاربر در بک‌اند = ساخت عضویت. |
| `users.edit` | ویرایش کاربران | `identity.iam.membership.manage` | معادل ناقص — ویرایش کاربر در بک‌اند از مسیر عضویت. |
| `users.import` | واردسازی دسته‌ای کاربران | `identity.iam.membership.manage` | معادل ناقص — واردسازی دسته‌ای = چند عضویت. |
| `users.block` | مسدودسازی کاربران | `identity.iam.membership.manage` | معادل کامل |
| `users.guest` | دعوت حساب مهمان | — | پیشنهاد افزودن به بک‌اند: `identity.iam.membership.invite_guest` |

### نقش‌ها و دسترسی

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `roles.list` | مشاهده فهرست نقش‌ها | `identity.iam.role.manage` | معادل ناقص — بک‌اند مجوز جداگانه‌ی «مشاهده‌ی نقش‌ها» ندارد. |
| `roles.create` | ایجاد نقش جدید | `identity.iam.role.manage` | معادل کامل |
| `roles.edit` | ویرایش نقش و دسترسی‌ها | `identity.iam.role.manage` | معادل کامل |
| `roles.delete` | حذف نقش | `identity.iam.role.manage` | معادل کامل |
| `roles.assign` | تخصیص نقش به کاربران | `identity.iam.binding.manage` | معادل کامل |

### همکاران

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `members.view` | مشاهده‌ی اعضای سازمان | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `relations.use` | ارتباطات من (درخواست، پذیرش، مسدودسازی) | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### مجلات و بلاگ

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `magazines.list` | مشاهده‌ی مجلات و بلاگ | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `magazines.create` | نوشتن مجله و بلاگ | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `magazines.manage` | ویرایش، انتشار و حذف مطالب دیگران | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### اخبار سازمان

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `news.list` | مشاهده‌ی اخبار | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `news.create` | نوشتن خبر | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `news.manage` | ویرایش، انتشار و حذف اخبار دیگران | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### رسانه

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `media.list` | مشاهده‌ی رسانه‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `media.upload` | بارگذاری تصویر، ویدیو و آلبوم | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `media.manage` | ویرایش، انتشار و حذف رسانه‌ی دیگران | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### پرسش و پاسخ

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `forum.list` | مشاهده‌ی پرسش‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `forum.create` | طرح پرسش | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `forum.reply` | پاسخ‌دادن | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `forum.moderate` | سنجاق، قفل و حذف پرسش‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### هشتگ‌ها، موضوعات و نظرها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `taxonomy.manage` | مدیریت هشتگ‌ها و موضوعات | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `comments.moderate` | تأیید و حذف نظرها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### گفتگوها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `chat.view` | پیام مستقیم و پیام‌های ذخیره‌شده | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### گروه‌ها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `groups.list` | مشاهده و عضویت در گروه‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `groups.create` | ساخت گروه | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `groups.manage` | مدیریت همه‌ی گروه‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### کانال‌ها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `channels.list` | مشاهده و عضویت در کانال‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `channels.create` | ساخت کانال | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `channels.manage` | مدیریت همه‌ی کانال‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### رویدادها و جلسات

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `events.list` | مشاهده‌ی تقویم و شرکت در رویداد | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `events.create` | ساخت رویداد و دعوت | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `events.manage` | مدیریت همه‌ی رویدادها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### اسناد و فایل‌ها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `files.use` | مدیر فایل شخصی و گروهی | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### مدیریت شبکه

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `social.dashboards` | داشبورد مدیریتی ماژول‌ها | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `social.settings` | تنظیمات ماژول‌ها و واکنش‌های مجاز | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### مدیریت دانش

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `knowledge.list` | مشاهده اسناد | `workspace.knowledge.document.view` | معادل کامل |
| `knowledge.upload` | بارگذاری سند | `workspace.knowledge.document.create` | معادل کامل |
| `knowledge.edit` | ویرایش سند | `workspace.knowledge.document.update` | معادل کامل |
| `knowledge.delete` | حذف سند | `workspace.knowledge.document.delete` | معادل کامل |
| `knowledge.categories` | مدیریت دسته‌بندی اسناد | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.categories` |
| `knowledge.visibility` | تغییر سطح دسترسی اسناد | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.visibility` |
| `knowledge.approve` | بررسی، تأیید و انتشار اسناد | `workspace.knowledge.document.publish` | معادل کامل |
| `knowledge.archive` | آرشیو و بازیابی اسناد | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.archive` |
| `knowledge.confidential` | مشاهده‌ی اسناد محرمانه | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.confidential` |
| `knowledge.registry` | مدیریت شناسنامه‌ها | `workspace.knowledge.profile.update` | معادل کامل |
| `knowledge.rnd` | مدیریت سندهای فرصت تحقیق و توسعه | `workspace.knowledge.research_progress.transition` | معادل ناقص — به‌همراه research_progress.create/delete/view. |
| `knowledge.processes` | مدیریت فرآیندها | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.processes` |
| `knowledge.experiences` | ثبت و انتشار تجربیات و درس‌آموخته‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.experiences` |
| `knowledge.experts` | مدیریت خبرگان | `workspace.knowledge.profile.create` | معادل ناقص — شناسنامه‌ی خبرگان در بک‌اند «profile» است. |
| `knowledge.glossary` | مدیریت واژه‌نامه | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.glossary` |
| `knowledge.reports` | گزارش‌ها و تحلیل دانش | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.reports` |
| `knowledge.settings` | تنظیمات مدیریت دانش | `workspace.knowledge.configuration.view` | معادل ناقص — بک‌اند فقط مشاهده‌ی پیکربندی دارد؛ ویرایش پیشنهاد می‌شود. |
| `knowledge.download` | دانلود اسناد محرمانه (فراتر از سطح دسترسی) | `workspace.knowledge.document.download` | معادل کامل |
| `knowledge.audit` | مشاهده‌ی لاگ ممیزی دانش | — | پیشنهاد افزودن به بک‌اند: `workspace.knowledge.audit` |

### مدیریت پروژه

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `projects.list` | مشاهده پروژه‌ها | `workspace.projects.project.view` | معادل کامل |
| `projects.create` | ایجاد پروژه | `workspace.projects.project.create` | معادل کامل |
| `projects.edit` | ویرایش پروژه | `workspace.projects.project.update` | معادل کامل |
| `projects.delete` | حذف پروژه | `workspace.projects.project.delete` | معادل کامل |
| `projects.archive` | بایگانی و بازیابی پروژه | `workspace.projects.project.update` | معادل ناقص — بایگانی در بک‌اند تغییر وضعیت پروژه است. |
| `projects.tasks` | ایجاد و تخصیص وظایف | `workspace.projects.task.create` | معادل ناقص — به‌همراه task.assign و task.update. |
| `projects.tasks.delete` | حذف وظایف | `workspace.projects.task.delete` | معادل کامل |
| `projects.progress` | ثبت گزارش پیشرفت | `workspace.projects.task.transition` | معادل ناقص — ثبت پیشرفت = جابه‌جایی وضعیت وظیفه. |
| `projects.members` | مدیریت اعضا و نقش‌های پروژه | `workspace.projects.member.manage` | معادل کامل |
| `projects.budget` | تعیین بودجه و سرفصل‌های مالی | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.budget.manage` |
| `projects.expenses` | ثبت و ویرایش هزینه‌ها | `workspace.projects.expense.manage` | معادل کامل |
| `projects.expenses.approve` | تأیید و پرداخت هزینه‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.expense.approve` |
| `projects.risks` | مدیریت ریسک‌ها و مشکلات | `workspace.projects.risk.manage` | معادل کامل |
| `projects.meetings` | مدیریت جلسات و صورت‌جلسات | `workspace.projects.meeting.manage` | معادل کامل |
| `projects.documents` | مدیریت اسناد پروژه | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.documents` |
| `projects.templates` | مدیریت قالب‌های پروژه | `workspace.projects.playbook_template.update` | معادل ناقص — به‌همراه playbook_template.create/delete. |
| `projects.groups` | مدیریت گروه‌های پروژه | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.groups` |
| `projects.playbooks` | اجرا و مدیریت Playbook | `workspace.projects.playbook_execution.manage` | معادل کامل |
| `projects.notifications` | قواعد اعلان و خودکارسازی | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.notifications` |
| `projects.reports` | مشاهده گزارش‌ها و خروجی | `workspace.projects.risk_analysis.view` | معادل ناقص — فقط تحلیل ریسک؛ گزارش‌ساز عمومی پیشنهاد می‌شود. |
| `projects.history` | مشاهده تاریخچه رویدادها | — | پیشنهاد افزودن به بک‌اند: `workspace.projects.history.view` |

### قراردادها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `contracts.list` | مشاهده قراردادها | — | پیشنهاد افزودن به بک‌اند: `workspace.contracts.list` |
| `contracts.create` | ثبت قرارداد | — | پیشنهاد افزودن به بک‌اند: `workspace.contracts.create` |
| `contracts.edit` | ویرایش قرارداد | — | پیشنهاد افزودن به بک‌اند: `workspace.contracts.edit` |
| `contracts.delete` | حذف قرارداد | — | پیشنهاد افزودن به بک‌اند: `workspace.contracts.delete` |
| `contracts.stage` | تغییر مرحله قرارداد | — | پیشنهاد افزودن به بک‌اند: `workspace.contracts.stage` |

### صندوق نوآوری و شتاب‌دهی

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `funds.list` | مشاهده طرح‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.list` |
| `funds.submit` | ثبت طرح جدید | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.submit` |
| `funds.refer` | ارجاع طرح به داوری | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.refer` |
| `funds.score` | امتیازدهی و داوری طرح | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.score` |
| `funds.allocate` | تخصیص منابع و اقساط | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.allocate` |
| `funds.monitor` | پایش و ثبت KPI طرح | — | پیشنهاد افزودن به بک‌اند: `workspace.funds.monitor` |

### فرصت‌های پژوهشی

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `research.list` | مشاهده فراخوان‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.research.list` |
| `research.create` | ایجاد فراخوان | — | پیشنهاد افزودن به بک‌اند: `workspace.research.create` |
| `research.edit` | ویرایش فراخوان | — | پیشنهاد افزودن به بک‌اند: `workspace.research.edit` |
| `research.close` | بستن فراخوان | — | پیشنهاد افزودن به بک‌اند: `workspace.research.close` |

### گزارش‌گیری

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `reports.view` | مشاهده داشبورد گزارش‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.reports.view` |
| `reports.export` | دریافت خروجی گزارش | — | پیشنهاد افزودن به بک‌اند: `workspace.reports.export` |

### آموزش و توانمندسازی

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `training.list` | مشاهده دوره‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.training.list` |
| `training.create` | تعریف دوره جدید | — | پیشنهاد افزودن به بک‌اند: `workspace.training.create` |
| `training.enroll` | ثبت‌نام در دوره | — | پیشنهاد افزودن به بک‌اند: `workspace.training.enroll` |
| `training.evaluate` | ارزشیابی و سنجش اثربخشی | — | پیشنهاد افزودن به بک‌اند: `workspace.training.evaluate` |
| `training.certificate` | صدور گواهینامه | — | پیشنهاد افزودن به بک‌اند: `workspace.training.certificate` |

### هلدینگ‌ها و شرکت‌ها

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `companies.view` | مشاهده ساختار هلدینگ‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.companies.view` |
| `companies.manage` | مدیریت شرکت‌های زیرمجموعه | — | پیشنهاد افزودن به بک‌اند: `workspace.companies.manage` |
| `companies.publish-global` | انتشار محتوای سراسری | — | پیشنهاد افزودن به بک‌اند: `workspace.companies.publish-global` |
| `companies.publish-holding` | انتشار در سطح هلدینگ | — | پیشنهاد افزودن به بک‌اند: `workspace.companies.publish-holding` |

### دستیار هوشمند

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `assistant.chat` | پرسش‌وپاسخ از دستیار مدیریتی | — | پیشنهاد افزودن به بک‌اند: `workspace.assistant.chat` |
| `assistant.evaluate` | اجرای ارزیابی هوشمند پروپوزال | — | پیشنهاد افزودن به بک‌اند: `workspace.assistant.evaluate` |
| `assistant.configure` | پیکربندی چت‌بات‌ها | — | پیشنهاد افزودن به بک‌اند: `workspace.assistant.configure` |

### تنظیمات سامانه

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `settings.branding` | برندسازی سازمان | — | پیشنهاد افزودن به بک‌اند: `identity.iam.branding.manage` |
| `settings.modules` | فعال/غیرفعال‌سازی ماژول‌ها | `identity.iam.entitlement.manage` | معادل کامل |
| `settings.pages` | مدیریت صفحات و منوها | — | پیشنهاد افزودن به بک‌اند: `identity.iam.settings.pages` |
| `settings.security` | تنظیمات امنیت و انطباق | — | پیشنهاد افزودن به بک‌اند: `identity.iam.login_policy.manage` |
| `settings.system` | تنظیمات کلی سیستم | `identity.iam.scope_schema.manage` | معادل ناقص — فقط بخش «انواع واحد و قواعد والد/فرزند». |
| `settings.storage` | مدیریت فضای ذخیره‌سازی | — | پیشنهاد افزودن به بک‌اند: `identity.iam.settings.storage` |

### وبلاگ

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `blog.list` | مشاهده‌ی وبلاگ | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `blog.create` | نوشتن پست وبلاگ | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |
| `blog.manage` | ویرایش، انتشار و حذف پست‌های دیگران | — | سرویس social.shub.ir (خارج از کاتالوگ Identity) |

### تقویم

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `calendar.view` | مشاهده‌ی تقویم یکپارچه | — | پیشنهاد افزودن به بک‌اند: `workspace.calendar.view` |
| `calendar.team` | مشاهده‌ی تقویم همکاران و تیم | — | پیشنهاد افزودن به بک‌اند: `workspace.calendar.team` |

### گزارش فعالیت و زمان کاری

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `timesheet.log` | ثبت زمان کاری و مرخصی خود | — | پیشنهاد افزودن به بک‌اند: `workspace.timesheet.log` |
| `timesheet.integrations` | اتصال ابزارهای بیرونی (GitLab، GitHub، Jira …) | — | پیشنهاد افزودن به بک‌اند: `workspace.timesheet.integrations` |
| `timesheet.team` | مشاهده‌ی زمان کاری اعضای زیرمجموعه | — | پیشنهاد افزودن به بک‌اند: `workspace.timesheet.team` |
| `timesheet.approve` | تأیید یا برگشت کارکرد ماهانه | — | پیشنهاد افزودن به بک‌اند: `workspace.timesheet.approve` |
| `timesheet.finance` | خلاصه‌ی مالی و خروجی حقوق | — | پیشنهاد افزودن به بک‌اند: `workspace.timesheet.finance` |

### تیکت پشتیبانی

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `tickets.create` | ثبت تیکت و پیگیری تیکت‌های خود | — | پیشنهاد افزودن به بک‌اند: `workspace.tickets.create` |
| `tickets.view-org` | مشاهده‌ی تیکت‌های همه‌ی اعضای زیرمجموعه | — | پیشنهاد افزودن به بک‌اند: `workspace.tickets.view-org` |
| `tickets.vendor` | پاسخ‌گویی به‌عنوان تیم سازنده (پشتیبانی) | — | پیشنهاد افزودن به بک‌اند: `workspace.tickets.vendor` |

### جایزه نوآوری و فناوری

| مجوز دمو | شرح | کد بک‌اند | وضعیت / یادداشت |
|---|---|---|---|
| `award.list` | مشاهده‌ی دوره‌ها و آثار جایزه | — | پیشنهاد افزودن به بک‌اند: `workspace.award.list` |
| `award.submit` | ارسال اثر به جایزه | — | پیشنهاد افزودن به بک‌اند: `workspace.award.submit` |
| `award.judge` | داوری آثار | — | پیشنهاد افزودن به بک‌اند: `workspace.award.judge` |
| `award.manage` | مدیریت دوره‌ها، داوران و نتایج | — | پیشنهاد افزودن به بک‌اند: `workspace.award.manage` |
