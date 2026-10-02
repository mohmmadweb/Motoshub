# بخش شبکه اجتماعی ← Motoshub Social API

مرجع: https://social.shub.ir/api/docs/ (OpenAPI 3.0.3 · v1.0.0 · ۲۵۶ endpoint در ۷ ماژول)

در دمو هیچ درخواست شبکه‌ای ارسال نمی‌شود؛ `src/context/SocialContext.tsx` همه‌ی endpointها را در مرورگر شبیه‌سازی می‌کند.
مدل داده (`src/social/types.ts`) با همان نام فیلدهای API (snake_case) نوشته شده و نگاشت «دکمه ← endpoint» در
`src/social/endpoints.ts` است. برای اتصال واقعی کافی است بدنه‌ی هر اکشن در SocialContext با `fetch` همان آدرس جایگزین شود.
در هر صفحه، دکمه‌ی کوچک «API» فهرست endpointهای همان صفحه را نشان می‌دهد.

## ساختار منو (کلاستر ← آیتم)
- **نمای کلی:** داشبورد، دستیار هوشمند
- **همکاران:** اعضای سازمان (در محدوده‌ی واحد فعلی)، ارتباطات من
- **دانش و محتوا:** وبلاگ، مجلات، اخبار سازمان، رسانه، پرسش و پاسخ، هشتگ‌ها
- **اسناد و فایل‌ها:** مدیریت اسناد و فایل‌ها
- **تعامل و همکاری:** تقویم، گفتگو، گروه‌ها، کانال‌ها، رویداد و جلسات
- **پروژه و فعالیت‌ها:** پروژه‌های من، فعالیت و وظایف من، گزارش فعالیت‌های من
- **دانش و نوآوری:** مدیریت دانش (مرکز راهنما در تب «راهنما»)، فرصت‌های پژوهشی، قراردادهای فناورانه، صندوق نوآوری و شتاب‌دهی، جایزه، آموزش و توانمندسازی
- **مدیریت سامانه:** تنظیمات سامانه (شامل ظاهر و برندسازی و مدیریت شبکه‌ی اجتماعی)، نقش و دسترسی من، تیکت پشتیبانی

کلاسترها جمع‌شونده‌اند و کلاسترِ صفحه‌ی فعلی همیشه باز است. «گزارش‌گیری پیشرفته» حذف شد و هر ماژول دکمه‌ی «گزارش‌ساز» خودش را دارد.
مدل دسترسی: [IAM_MODEL.md](IAM_MODEL.md).

## منو ← ماژول API

| منو | مسیر دمو | endpointها |
|---|---|---|
| همکاران ← اعضای سازمان | `/dashboard/members` | `relations/friendships/send-request`, `respond`, `delete-sent-request`, `block`, `unblock` · `messaging/direct-messages` |
| همکاران ← ارتباطات من | `/dashboard/connections` | `relations/friendships/` (+ `requests`, `sent-requests`, `blocked`, `unfriend`) · `relations/dashboards/user` |
| دانش و محتوا ← وبلاگ | `/dashboard/blog` | `content/blogs/*` |
| دانش و محتوا ← مجلات | `/dashboard/magazines` | `content/magazines/*` |
| دانش و محتوا ← اخبار سازمان | `/dashboard/news` | `content/news/*` |
| دانش و محتوا ← رسانه | `/dashboard/media` | `media/media/posts/*` (image / video / album) |
| دانش و محتوا ← پرسش و پاسخ | `/dashboard/forum` | `forums/forums/topics/*` (pin, lock) · `forums/forums/posts/*` |
| دانش و محتوا ← هشتگ‌ها | `/dashboard/topics` | `core/tags/*` · `core/categories/{entity_name}/*` |
| تعامل و همکاری ← گفتگو | `/dashboard/chat` | `messaging/direct-messages/*` · `saved-messages/*` · `bots/*` · `messages/{id}` (edit, delete, forward, save) |
| تعامل و همکاری ← گروه‌ها | `/dashboard/groups` | `messaging/groups/*` (topics, invite, members, mute, privacy, rename…) |
| تعامل و همکاری ← کانال‌ها | `/dashboard/channels` | `messaging/channels/*` (sub-channels, members, mute, privacy…) |
| تعامل و همکاری ← رویداد و جلسات | `/dashboard/events` (تقویم یکپارچه: `/dashboard/calendar`) | `events/events/*` (invite, invitations, rsvp, join, leave, members, promote/demote) |
| پروژه و فعالیت‌ها | `/dashboard/projects`, `/my-work`, `/activity` | ماژول مدیریت پروژه (api2.shub.ir) |
| اسناد و فایل‌ها | `/dashboard/files` | `core/file-manager/user/*` · `core/file-manager/{group|channel}/{id}/*` |
| تنظیمات سامانه ← شبکه‌ی اجتماعی و نظارت محتوا | `/dashboard/settings?section=social` | `*/dashboards/admin/` · `core/comments/{entity}/unapproved` + `approve` · `core/allowed-reactions` · `*/setting/{key}` |

مشترک در همه‌ی ماژول‌ها: `core/comments/{entity_name}/` (نظر با تأیید مدیر و پاسخ تو در تو)،
`core/reactions/{entity_name}/` (واکنش از فهرست `allowed-reactions`)، فیلدهای `privacy` (ME / FRIENDS / EVERYONE)،
`is_draft` + `publish/unpublish`، `category_ids`، `tags`، `uploaded_files` و `send_notification`.

حذف‌شده از منو (در API وجود ندارند): «نظرسنجی و آزمون»، «مسابقات و چالش‌ها»، فید پست آزاد داشبورد و «گروه‌های تعاملی» قدیمی
(پست‌های گروه‌ها به پیام‌های همان گروه در `messaging/groups` منتقل شده‌اند).

## نقش‌ها

نقش‌ها دیگر ثابت نیستند: هر مدیر در واحد خودش نقش سفارشی با مجوزهای ریز می‌سازد و کاربر می‌تواند هم‌زمان چند نقش داشته باشد
(دسترسی = اجتماع). کارت نقش در داشبورد از روی مجوزهای مؤثر انتخاب می‌شود، نه نام نقش. جزئیات: [IAM_MODEL.md](IAM_MODEL.md).

## کارت‌های داشبورد (برای همه‌ی نقش‌ها)
کارهای من · جلسات و رویدادهای پیش‌رو · اعلان‌های مهم سازمان · پروژه‌های فعال من · پیشنهاد برای شما (محتوای هم‌خوان با مهارت‌ها و تعامل‌های کاربر) ·
همکاری پیشنهادی (افراد با ارتباط مشترک/هم‌سازمانی/مهارت مشترک و گروه‌های عمومی) · تازه‌ترین اعلان‌ها · پیام‌ها و منشن‌ها · منتظر تصمیم من.

## endpointهای «پیشنهادی» (در API فعلی نیستند)

رابط کاربری دمو این‌ها را شبیه‌سازی می‌کند و در دکمه‌ی «API» هر صفحه با برچسب کهربایی «پیشنهادی» نشان داده می‌شوند. فهرست از `src/social/endpoints.ts` استخراج شده است.

| حوزه | متد | مسیر | کلید در کد |
|---|---|---|---|
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `${fm(o, id)}/files/{f}/preview/` | `filePreview` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `${fm(o, id)}/files/{f}/versions/` | `fileVersions` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `POST` | `${fm(o, id)}/files/{f}/versions/` | `fileVersionUpload` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `POST` | `${fm(o, id)}/files/{f}/versions/{v}/restore/` | `fileVersionRestore` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `/core/file-manager/trash/` | `fileTrash` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `POST` | `/core/file-manager/trash/{f}/restore/` | `fileRestore` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `DELETE` | `/core/file-manager/trash/{f}/` | `filePurge` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `POST` | `/core/file-manager/files/{f}/star/` | `fileStar` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `/core/file-manager/starred/` | `fileStarred` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `/core/file-manager/recent/` | `fileRecent` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `POST` | `${fm(o, id)}/files/{f}/share-link/` | `fileShare` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `DELETE` | `${fm(o, id)}/files/{f}/share-link/` | `fileShareRevoke` |
| پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه | `GET` | `${fm(o, id)}/quota/` | `fileQuota` |
| تغییر نام، فعالیت فایل و «اشتراک‌گذاشته با من» | `PATCH` | `${fm(o, id)}/files/{f}/` | `fileRename` |
| تغییر نام، فعالیت فایل و «اشتراک‌گذاشته با من» | `GET` | `${fm(o, id)}/files/{f}/activity/` | `fileActivity` |
| تغییر نام، فعالیت فایل و «اشتراک‌گذاشته با من» | `GET` | `/core/file-manager/shared-with-me/` | `fileSharedWithMe` |
| اطلاعیه‌ی رسمی و تأیید خواندن | `POST` | `/content/news/{id}/acknowledge/` | `newsAcknowledge` |
| اطلاعیه‌ی رسمی و تأیید خواندن | `GET` | `/content/news/{id}/read-status/` | `newsReadStatus` |
| اطلاعیه‌ی رسمی و تأیید خواندن | `POST` | `/content/news/{id}/remind-unread/` | `newsRemind` |
| اطلاعیه‌ی رسمی و تأیید خواندن | `GET` | `/content/news/pinned/` | `newsPinned` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/content/{k}/{id}/submit-review/` | `contentSubmitReview` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/content/{k}/{id}/approve/` | `contentApproveReview` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/content/{k}/{id}/return/` | `contentReturnReview` |
| بازبینی پیش از انتشار و آمار هر مطلب | `GET` | `/content/{k}/pending-review/` | `contentReviewQueue` |
| بازبینی پیش از انتشار و آمار هر مطلب | `GET` | `/content/{k}/{id}/analytics/` | `contentAnalytics` |
| بازبینی پیش از انتشار و آمار هر مطلب | `GET` | `/media/media/posts/{id}/analytics/` | `mediaAnalytics` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/core/reports/` | `reportCreate` |
| بازبینی پیش از انتشار و آمار هر مطلب | `GET` | `/core/reports/?status=open` | `reportQueue` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/core/reports/{id}/dismiss/` | `reportDismiss` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/core/reports/{id}/hide/` | `reportHide` |
| بازبینی پیش از انتشار و آمار هر مطلب | `POST` | `/core/reports/{id}/remove-and-warn/` | `reportRemoveWarn` |
| رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه | `POST` | `/forums/forums/topics/{id}/vote/` | `topicVote` |
| رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه | `POST` | `/forums/forums/posts/{id}/vote/` | `postVote` |
| رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه | `POST` | `/forums/forums/topics/{id}/accept-answer/` | `topicAccept` |
| رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه | `POST` | `/forums/forums/topics/{id}/mark-duplicate/` | `topicDuplicate` |
| رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه | `GET` | `/forums/forums/topics/similar/?q=` | `topicSimilar` |
| واکنش، رشته، سنجاق و جستجو داخل گفتگو | `POST` | `/messaging/messaging/messages/{id}/reactions/` | `messageReact` |
| واکنش، رشته، سنجاق و جستجو داخل گفتگو | `GET` | `/messaging/messaging/messages/{id}/thread/` | `messageThread` |
| واکنش، رشته، سنجاق و جستجو داخل گفتگو | `POST` | `/messaging/messaging/messages/{id}/pin/` | `messagePin` |
| واکنش، رشته، سنجاق و جستجو داخل گفتگو | `GET` | `/messaging/messaging/{t}/{id}/pinned/` | `chatPinned` |
| واکنش، رشته، سنجاق و جستجو داخل گفتگو | `GET` | `/messaging/messaging/{t}/{id}/messages/?q=` | `chatSearch` |

سایر نیازهای بک‌اند: فیلد دامنه‌ی سازمانی (`scope_id`) روی همه‌ی موجودیت‌ها، و نگاشت مجوزها در [PERMISSION_MAPPING.md](PERMISSION_MAPPING.md).
