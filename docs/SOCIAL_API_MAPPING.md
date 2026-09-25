# بخش شبکه اجتماعی ← Motoshub Social API

مرجع: https://social.shub.ir/api/docs/ (OpenAPI 3.0.3 · v1.0.0 · ۲۵۶ endpoint در ۷ ماژول)

در دمو هیچ درخواست شبکه‌ای ارسال نمی‌شود؛ `src/context/SocialContext.tsx` همه‌ی endpointها را در مرورگر شبیه‌سازی می‌کند.
مدل داده (`src/social/types.ts`) با همان نام فیلدهای API (snake_case) نوشته شده و نگاشت «دکمه ← endpoint» در
`src/social/endpoints.ts` است. برای اتصال واقعی کافی است بدنه‌ی هر اکشن در SocialContext با `fetch` همان آدرس جایگزین شود.
در هر صفحه، دکمه‌ی کوچک «API» فهرست endpointهای همان صفحه را نشان می‌دهد.

## ساختار منو (کلاستر ← گروه ← آیتم)
- **نمای کلی:** داشبورد، دستیار هوشمند
- **شبکه اجتماعی:** همکاران · دانش و محتوا · تعامل و همکاری · رویدادها و جلسات · اسناد و فایل‌ها · بخش‌های ویژه مدیران
- **مدیریت پروژه:** پروژه‌ها و فعالیت‌ها (پروژه‌های من، فعالیت‌ها و وظایف، تیم‌ها و مستندات پروژه)
- **دانش و نوآوری:** مدیریت دانش، فرصت‌های پژوهشی، قراردادهای فناورانه، صندوق نوآوری و شتاب‌دهی، جایزه، آموزش و توانمندسازی
- **مدیریت سامانه:** پنل راهبری، گزارش‌گیری پیشرفته، نقش و دسترسی من، ظاهر و برندسازی، تیکت پشتیبانی، راهنما

کلاسترها جمع‌شونده‌اند (وضعیت در مرورگر کاربر ذخیره می‌شود) و کلاسترِ صفحه‌ی فعلی همیشه باز است.

## منو ← ماژول API

| منو | مسیر دمو | endpointها |
|---|---|---|
| همکاران ← اعضای سازمان | `/dashboard/members` | `relations/friendships/send-request`, `respond`, `delete-sent-request`, `block`, `unblock` · `messaging/direct-messages` |
| همکاران ← ارتباطات من | `/dashboard/connections` | `relations/friendships/` (+ `requests`, `sent-requests`, `blocked`, `unfriend`) · `relations/dashboards/user` |
| دانش و محتوا ← مجلات (تب «بلاگ» داخل همین صفحه) | `/dashboard/magazines` | `content/magazines/*` · `content/blogs/*` |
| دانش و محتوا ← اخبار سازمان | `/dashboard/news` | `content/news/*` |
| دانش و محتوا ← رسانه | `/dashboard/media` | `media/media/posts/*` (image / video / album) |
| دانش و محتوا ← پرسش و پاسخ | `/dashboard/forum` | `forums/forums/topics/*` (pin, lock) · `forums/forums/posts/*` |
| دانش و محتوا ← هشتگ‌ها و موضوعات | `/dashboard/topics` | `core/tags/*` · `core/categories/{entity_name}/*` |
| تعامل و همکاری ← گفتگوها | `/dashboard/chat` | `messaging/direct-messages/*` · `saved-messages/*` · `bots/*` · `messages/{id}` (edit, delete, forward, save) |
| تعامل و همکاری ← گروه‌ها | `/dashboard/groups` | `messaging/groups/*` (topics, invite, members, mute, privacy, rename…) |
| تعامل و همکاری ← کانال‌ها | `/dashboard/channels` | `messaging/channels/*` (sub-channels, members, mute, privacy…) |
| رویدادها و جلسات ← تقویم | `/dashboard/events` | `events/events/*` (invite, invitations, rsvp, join, leave, members, promote/demote) |
| پروژه‌ها و فعالیت‌ها | `/dashboard/projects`, `/my-work`, `/project-teams` | ماژول مدیریت پروژه (api2.shub.ir) |
| اسناد و فایل‌ها | `/dashboard/files` | `core/file-manager/user/*` · `core/file-manager/{group|channel}/{id}/*` |
| بخش‌های ویژه مدیران ← داشبورد مدیریتی شبکه | `/dashboard/social-admin` | `*/dashboards/admin/` · `core/comments/{entity}/unapproved` + `approve` · `core/allowed-reactions` · `*/setting/{key}` |

مشترک در همه‌ی ماژول‌ها: `core/comments/{entity_name}/` (نظر با تأیید مدیر و پاسخ تو در تو)،
`core/reactions/{entity_name}/` (واکنش از فهرست `allowed-reactions`)، فیلدهای `privacy` (ME / FRIENDS / EVERYONE)،
`is_draft` + `publish/unpublish`، `category_ids`، `tags`، `uploaded_files` و `send_notification`.

حذف‌شده از منو (در API وجود ندارند): «نظرسنجی و آزمون»، «مسابقات و چالش‌ها»، فید پست آزاد داشبورد و «گروه‌های تعاملی» قدیمی
(پست‌های گروه‌ها به پیام‌های همان گروه در `messaging/groups` منتقل شده‌اند).

## نقش‌ها

| نقش | منو و داشبورد |
|---|---|
| **مدیر سامانه** | همه‌ی منوها + پنل راهبری + داشبورد مدیریتی شبکه؛ کارت نقش: آمار admin همه‌ی ماژول‌ها و صف تأیید نظرها |
| **مدیر محتوا** | انتشار و مدیریت مجلات، اخبار و رسانه‌ی همه، تأیید نظرها، هشتگ‌ها و موضوعات، مدیریت دانش؛ کارت نقش: پیش‌نویس‌ها، صف نظرها، آمار محتوا |
| **مدیر پروژه** | ساخت و مدیریت کامل پروژه‌ها، بودجه و اسناد، رویداد و گروه برای تیم؛ کارت نقش: سلامت پروژه‌های تحت مدیریت |
| **مدیر گروه** | ساخت و اداره‌ی گروه‌ها و کانال‌ها (اعضا، تاپیک، زیرکانال، فایل)، رویداد؛ کارت نقش: گروه‌ها و کانال‌های تحت مدیریت |
| **کاربر عادی** | همکاران، محتوا (خواندن، نوشتن بلاگ و رسانه‌ی شخصی)، پرسش و پاسخ، گفتگو، عضویت در گروه/کانال، تقویم، تسک‌های خودش و فایل‌های شخصی |

لایه‌ی سازمانی (سیستم / هلدینگ / شرکت / گروه) جدا از نقش حفظ شده است؛ تعیین می‌کند نقش در کدام دامنه اعمال شود.

## کارت‌های داشبورد (برای همه‌ی نقش‌ها)
کارهای من · جلسات و رویدادهای پیش‌رو · اعلان‌های مهم سازمان · پروژه‌های فعال من · پیشنهاد برای شما (محتوای هم‌خوان با مهارت‌ها و تعامل‌های کاربر) ·
همکاری پیشنهادی (افراد با ارتباط مشترک/هم‌سازمانی/مهارت مشترک و گروه‌های عمومی) · تازه‌ترین اعلان‌ها · پیام‌ها و منشن‌ها · منتظر تصمیم من.
