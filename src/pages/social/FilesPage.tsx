// ---------------------------------------------------------------------------
// «اسناد و فایل‌ها» — مدیر فایل Motoshub Social API (core/file-manager).
// هر «درایو» یک مالک دارد: کاربر (user)، گروه (group) یا کانال (channel).
// درایو شخصی: /core/file-manager/user/folders|files
// درایو گروه/کانال: /core/file-manager/{owner_type}/{owner_id}/folders|files
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FolderOpen, Folder, FolderPlus, Upload, Download, Pencil, Trash2, MoveRight, Search, ChevronLeft, HardDrive, Users, Megaphone, Briefcase, Lock, Home, X, Star, Clock, RotateCcw, Link2, Share2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial, parseSize, TRASH_DAYS } from "../../context/SocialContext";
import { dayNum } from "../../pm/jalali";
import FilePreview, { shareAlive } from "./files/FilePreview";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints, fmtEndpoint } from "../../social/endpoints";
import type { Chat, FileFolder, FileItem, OwnerType } from "../../social/types";
import { ApiChip, Field, UserLine, fa, fileIcon, stamp, toAttachments } from "./kit";

type Drive = { type: OwnerType; id: string; title: string; chat?: Chat };
const driveKey = (d: { type: OwnerType; id: string }) => `${d.type}:${d.id}`;
/** نمای صفحه: درایو، دسترسی سریع (اخیر/ستاره‌دار) یا سطل بازیافت — «پیشنهادی» */
type View = "drive" | "recent" | "starred" | "shared" | "trash";
/** سهمیه‌ی نمایشی هر درایو */
const QUOTA: Record<OwnerType, number> = { user: 2 * 1024 ** 3, group: 10 * 1024 ** 3, channel: 10 * 1024 ** 3 };
const fmtBytes = (b: number) =>
  b >= 1024 ** 3 ? `${(b / 1024 ** 3).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} گیگابایت` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(b / 1024)).toLocaleString("fa-IR")} کیلوبایت`;

export default function FilesPage() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();

  // ------------------------------------------------------------ درایوها
  const drives: Drive[] = useMemo(() => {
    const own: Drive = { type: "user", id: s.me, title: "فایل‌های من" };
    const chats = s
      .myChats(["group", "channel"])
      .filter((c) => !c.parent)
      .sort((a, b) => (a.chat_type === b.chat_type ? a.title.localeCompare(b.title, "fa") : a.chat_type === "group" ? -1 : 1));
    return [own, ...chats.map((c) => ({ type: c.chat_type as OwnerType, id: c.id, title: c.title, chat: c }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.chats, s.me]);

  const ownerParam = params.get("owner");
  const viewParam = params.get("view");
  const view: View = viewParam === "recent" || viewParam === "starred" || viewParam === "trash" || viewParam === "shared" ? viewParam : "drive";
  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    if (v === "drive") next.delete("view");
    else next.set("view", v);
    setParams(next, { replace: true });
  };
  const [previewId, setPreviewId] = useState<string | null>(null);
  const drive = drives.find((d) => driveKey(d) === ownerParam) ?? drives[0];
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const selectDrive = (d: Drive) => {
    setFolderId(null);
    setQ("");
    const next = new URLSearchParams(params);
    next.delete("view");
    if (d.type === "user") next.delete("owner");
    else next.set("owner", driveKey(d));
    setParams(next, { replace: true });
  };

  const folders = s.folders.filter((f) => f.owner_type === drive.type && f.owner_id === drive.id);
  const files = s.files.filter((f) => f.owner_type === drive.type && f.owner_id === drive.id);
  const current = folderId ? folders.find((f) => f.id === folderId) ?? null : null;
  const cwd = current?.id ?? null;

  // ------------------------------------------------------------ دسترسی
  const isChatAdmin = drive.chat ? s.chatRole(drive.chat) === "admin" : false;
  const canWrite = drive.type === "user" ? hasPermission("files.use") : isChatAdmin;
  /** دسترسی نوشتن روی فایلِ هر درایو (برای نماهای «اخیر/ستاره‌دار/سطل» که چند درایو را با هم نشان می‌دهند) */
  const writeIn = (o: { owner_type: OwnerType; owner_id: string }) => {
    if (o.owner_type === "user") return o.owner_id === s.me && hasPermission("files.use");
    const c = s.chats.find((x) => x.id === o.owner_id);
    return !!c && s.chatRole(c) === "admin";
  };
  const canDeleteFile = (f: FileItem) => writeIn(f) || (f.owner_type !== "user" && f.created_by_user_id === s.me);
  const driveKeys = new Set(drives.map(driveKey));
  const reachableFiles = s.files.filter((f) => driveKeys.has(driveKey({ type: f.owner_type, id: f.owner_id })));
  const driveTitle = (f: { owner_type: OwnerType; owner_id: string }) => drives.find((d) => d.type === f.owner_type && d.id === f.owner_id)?.title ?? "—";
  const lastTouch = (f: FileItem) => [f.opened_at?.[s.me] ?? "", f.created_by_user_id === s.me ? f.created_at : ""].sort().pop() ?? "";
  const recentFiles = reachableFiles.filter((f) => lastTouch(f)).sort((a, b) => lastTouch(b).localeCompare(lastTouch(a))).slice(0, 15);
  const starredFiles = reachableFiles.filter((f) => (f.starred_by ?? []).includes(s.me)).sort((a, b) => a.name.localeCompare(b.name, "fa"));
  const trashFiles = s.fileTrash.filter((f) => f.trashed_by === s.me || writeIn(f)).sort((a, b) => b.trashed_at.localeCompare(a.trashed_at));
  // «پیشنهادی» — اشتراک‌گذاشته با من: فایل‌های دیگران در درایو گروه/کانال‌های من + لینک‌های اشتراکی که مرا نام برده‌اند
  const sharedVia = (f: FileItem): { label: string; when: string } | null => {
    if (f.created_by_user_id === s.me) return null;
    if (f.share?.shared_with?.includes(s.me) && shareAlive(f, s.today)) return { label: `${s.userName(f.share.created_by)} · تا ${f.share.expires_on}${f.share.allow_download ? "" : " · فقط مشاهده"}`, when: f.share.created_at };
    if (f.owner_type !== "user" && driveKeys.has(driveKey({ type: f.owner_type, id: f.owner_id }))) return { label: `${f.owner_type === "group" ? "گروه" : "کانال"} ${driveTitle(f)} · ${s.userName(f.created_by_user_id)}`, when: f.created_at };
    return null;
  };
  const sharedFiles = s.files
    .map((f) => ({ f, via: sharedVia(f) }))
    .filter((x): x is { f: FileItem; via: { label: string; when: string } } => !!x.via)
    .sort((a, b) => b.via.when.localeCompare(a.via.when));
  const ageDays = (stampStr: string) => (dayNum(s.today) ?? 0) - (dayNum(stampStr.split(" ")[0]) ?? 0);
  // سهمیه: فایل‌ها + نسخه‌های قبلی + سطل بازیافتِ همان درایو
  const usedOf = (d: Drive) =>
    s.files.filter((f) => f.owner_type === d.type && f.owner_id === d.id).reduce((a, f) => a + parseSize(f.size) + (f.versions ?? []).reduce((x, v) => x + parseSize(v.size), 0), 0) +
    s.fileTrash.filter((f) => f.owner_type === d.type && f.owner_id === d.id).reduce((a, f) => a + parseSize(f.size), 0);
  const quotaDrive = view === "drive" ? drive : drives[0];
  const used = usedOf(quotaDrive);
  const quota = QUOTA[quotaDrive.type];
  const usedPct = Math.min(100, Math.round((used / quota) * 1000) / 10);
  const openPreview = (f: FileItem) => {
    s.openFile(f.id);
    setPreviewId(f.id);
  };
  const previewFile = previewId ? s.files.find((f) => f.id === previewId) : undefined;
  const canEditFolder = (f: FileFolder) => canWrite || (drive.type !== "user" && f.created_by_user_id === s.me);

  // ------------------------------------------------------------ کمکی درخت
  const pathOf = (id: string | null): FileFolder[] => {
    const out: FileFolder[] = [];
    let cur = id ? folders.find((f) => f.id === id) : undefined;
    while (cur) {
      out.unshift(cur);
      const pid: string | null = cur.parent_id;
      cur = pid ? folders.find((f) => f.id === pid) : undefined;
    }
    return out;
  };
  const descendants = (id: string): Set<string> => {
    const set = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => {
        if (f.parent_id && set.has(f.parent_id) && !set.has(f.id)) {
          set.add(f.id);
          grew = true;
        }
      });
    }
    return set;
  };
  const countInside = (id: string) => {
    const set = descendants(id);
    return { folders: set.size - 1, files: files.filter((f) => f.folder_id && set.has(f.folder_id)).length };
  };

  // ------------------------------------------------------------ فهرست فعلی
  const term = q.trim();
  const shownFolders = term ? folders.filter((f) => f.name.includes(term)) : folders.filter((f) => (f.parent_id ?? null) === cwd);
  const shownFiles = term ? files.filter((f) => f.name.includes(term)) : files.filter((f) => (f.folder_id ?? null) === cwd);
  shownFolders.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  shownFiles.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // ------------------------------------------------------------ اکشن‌ها
  const [nameModal, setNameModal] = useState<{ mode: "new" | "rename"; folder?: FileFolder } | null>(null);
  const [nameVal, setNameVal] = useState("");
  const [moveOf, setMoveOf] = useState<FileFolder | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const openNew = () => {
    setNameVal("");
    setNameModal({ mode: "new" });
  };
  const openRename = (f: FileFolder) => {
    setNameVal(f.name);
    setNameModal({ mode: "rename", folder: f });
  };
  const saveName = () => {
    const n = nameVal.trim();
    if (!n) return notify("نام پوشه را وارد کنید.", "warning");
    if (nameModal?.mode === "rename" && nameModal.folder) {
      s.updateFolder(nameModal.folder.id, { name: n });
      notify("نام پوشه تغییر کرد.", "success");
    } else {
      s.createFolder(drive.type, drive.id, n, cwd);
      notify(`پوشه‌ی «${n}» ساخته شد.`, "success");
    }
    setNameModal(null);
  };
  const doMove = () => {
    if (!moveOf) return;
    s.updateFolder(moveOf.id, { parent_id: moveTarget || null });
    notify(`«${moveOf.name}» منتقل شد.`, "success");
    setMoveOf(null);
  };
  const removeFolder = (f: FileFolder) => {
    const c = countInside(f.id);
    confirm({
      title: `حذف پوشه‌ی «${f.name}»؟`,
      message: c.folders || c.files ? `این پوشه و ${fa(c.folders)} زیرپوشه‌اش حذف می‌شوند؛ ${fa(c.files)} فایل داخلش به سطل بازیافت می‌رود و تا ${fa(TRASH_DAYS)} روز قابل بازگردانی است.` : "پوشه خالی است.",
      onConfirm: () => {
        s.deleteFolder(f.id);
        notify("پوشه حذف شد.", "success");
      },
    });
  };
  const removeFile = (f: FileItem) =>
    confirm({
      title: `حذف فایل «${f.name}»؟`,
      message: `به سطل بازیافت منتقل می‌شود و تا ${fa(TRASH_DAYS)} روز قابل بازگردانی است.`,
      confirmLabel: "انتقال به سطل",
      onConfirm: () => {
        s.deleteFile(f.id);
        notify("فایل به سطل بازیافت رفت.", "success");
      },
    });
  const upload = (list: FileList | File[]) => {
    if (!canWrite) return notify("در این درایو فقط مدیران گروه/کانال می‌توانند فایل بارگذاری کنند.", "warning");
    const at = toAttachments(list);
    if (!at.length) return;
    s.uploadFiles(drive.type, drive.id, cwd, at);
    notify(`${fa(at.length)} فایل بارگذاری شد.`, "success");
  };
  const download = (f: FileItem) => {
    if (f.owner_type === "user" && f.owner_id !== s.me && f.share && !f.share.allow_download) return notify("این فایل فقط برای مشاهده به اشتراک گذاشته شده است.", "warning");
    s.logFileDownload(f.id);
    notify(`دریافت «${f.name}» — ${fmtEndpoint(endpoints.fileDownload(f.owner_type, f.owner_id, f.id))}`, "info");
  };

  const crumbs = pathOf(cwd);
  const moveOptions = moveOf ? folders.filter((f) => !descendants(moveOf.id).has(f.id)) : [];
  const folderPath = (id: string | null) => pathOf(id).map((f) => f.name).join(" / ") || "ریشه";

  const DriveIcon = ({ d, size = 15 }: { d: Drive; size?: number }) => (d.type === "user" ? <HardDrive size={size} /> : d.type === "group" ? <Users size={size} /> : <Megaphone size={size} />);
  const driveCount = (d: Drive) => s.files.filter((f) => f.owner_type === d.type && f.owner_id === d.id).length;

  // ------------------------------------------------------------ ردیف‌ها
  const Actions = ({ children }: { children: ReactNode }) => <span className="flex items-center gap-0.5 shrink-0">{children}</span>;
  const IconBtn = ({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: ReactNode }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md text-ink-400 ${danger ? "hover:text-rose-600 hover:bg-rose-50" : "hover:text-brand-600 hover:bg-brand-50"}`}
    >
      {children}
    </button>
  );
  const folderActions = (f: FileFolder) =>
    canEditFolder(f) ? (
      <Actions>
        <IconBtn onClick={() => openRename(f)} title="تغییر نام">
          <Pencil size={14} />
        </IconBtn>
        <IconBtn
          onClick={() => {
            setMoveOf(f);
            setMoveTarget(f.parent_id ?? "");
          }}
          title="انتقال"
        >
          <MoveRight size={14} />
        </IconBtn>
        <IconBtn onClick={() => removeFolder(f)} title="حذف" danger>
          <Trash2 size={14} />
        </IconBtn>
      </Actions>
    ) : null;
  const fileActions = (f: FileItem) => (
    <Actions>
      <IconBtn onClick={() => s.toggleStar(f.id)} title={(f.starred_by ?? []).includes(s.me) ? "برداشتن ستاره" : "ستاره‌دار کردن"}>
        <Star size={14} className={(f.starred_by ?? []).includes(s.me) ? "fill-amber-400 text-amber-500" : ""} />
      </IconBtn>
      <IconBtn onClick={() => download(f)} title="دریافت">
        <Download size={14} />
      </IconBtn>
      {canDeleteFile(f) && (
        <IconBtn onClick={() => removeFile(f)} title="حذف" danger>
          <Trash2 size={14} />
        </IconBtn>
      )}
    </Actions>
  );
  const openFolder = (f: FileFolder) => {
    setQ("");
    setFolderId(f.id);
  };

  const empty = shownFolders.length === 0 && shownFiles.length === 0;

  return (
    <div>
      <PageHeader
        title="مدیریت اسناد و فایل‌ها"
        description="فایل‌های شخصی و فایل‌های مشترک گروه‌ها و کانال‌هایی که عضوشان هستید."
        icon={<FolderOpen size={20} />}
        actions={
          <ApiChip
            items={[
              { label: "فهرست پوشه‌ها", ep: endpoints.folders(drive.type, drive.id) },
              { label: "ساخت پوشه", ep: endpoints.folderCreate(drive.type, drive.id) },
              { label: "تغییر نام / انتقال پوشه (name, parent_id)", ep: endpoints.folderUpdate(drive.type, drive.id, "{id}") },
              { label: "حذف پوشه (با محتوا)", ep: endpoints.folderDelete(drive.type, drive.id, "{id}") },
              { label: "فهرست فایل‌ها", ep: { method: "GET", path: endpoints.fileUpload(drive.type, drive.id).path } },
              { label: "بارگذاری فایل", ep: endpoints.fileUpload(drive.type, drive.id) },
              { label: "حذف فایل", ep: endpoints.fileDelete(drive.type, drive.id, "{id}") },
              { label: "دریافت فایل", ep: endpoints.fileDownload(drive.type, drive.id, "{id}") },
              { label: "پیش‌نمایش", ep: endpoints.filePreview(drive.type, drive.id, "{id}") },
              { label: "تاریخچه‌ی نسخه‌ها", ep: endpoints.fileVersions(drive.type, drive.id, "{id}") },
              { label: "بارگذاری نسخه‌ی جدید", ep: endpoints.fileVersionUpload(drive.type, drive.id, "{id}") },
              { label: "بازگردانی نسخه", ep: endpoints.fileVersionRestore(drive.type, drive.id, "{id}", "{version}") },
              { label: "لینک اشتراک با انقضا", ep: endpoints.fileShare(drive.type, drive.id, "{id}") },
              { label: "لغو لینک اشتراک", ep: endpoints.fileShareRevoke(drive.type, drive.id, "{id}") },
              { label: "ستاره‌دار کردن", ep: endpoints.fileStar("{id}") },
              { label: "ستاره‌دارها", ep: endpoints.fileStarred() },
              { label: "اخیر", ep: endpoints.fileRecent() },
              { label: "سطل بازیافت", ep: endpoints.fileTrash() },
              { label: "بازگردانی از سطل", ep: endpoints.fileRestore("{id}") },
              { label: "حذف دائم", ep: endpoints.filePurge("{id}") },
              { label: "سهمیه‌ی فضا", ep: endpoints.fileQuota(drive.type, drive.id) },
              { label: "اشتراک‌گذاشته با من", ep: endpoints.fileSharedWithMe() },
              { label: "تغییر نام فایل", ep: endpoints.fileRename(drive.type, drive.id, "{id}") },
              { label: "فعالیت فایل", ep: endpoints.fileActivity(drive.type, drive.id, "{id}") },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-4">
        {/* ---------------------------------------------------- انتخاب درایو */}
        <aside className="space-y-3 min-w-0">
          <div className="card p-2">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {(
                [
                  ["recent", "اخیر", Clock, recentFiles.length],
                  ["shared", "اشتراک‌گذاشته با من", Share2, sharedFiles.length],
                  ["starred", "ستاره‌دار", Star, starredFiles.length],
                  ["trash", "سطل بازیافت", Trash2, trashFiles.length],
                ] as const
              ).map(([v, label, I, n]) => (
                <button
                  key={v}
                  onClick={() => setView(view === v ? "drive" : v)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-right whitespace-nowrap shrink-0 lg:shrink ${view === v ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600 hover:bg-ink-50"}`}
                >
                  <I size={15} className="shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                  <span className="text-[10.5px] text-ink-400 tabular-nums">{fa(n)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card p-2">
            <p className="text-[11px] text-ink-400 px-2 pt-1 pb-2">درایوها</p>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {drives.map((d) => {
                const on = view === "drive" && driveKey(d) === driveKey(drive);
                return (
                  <button
                    key={driveKey(d)}
                    onClick={() => selectDrive(d)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-right whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${on ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600 hover:bg-ink-50"}`}
                  >
                    <span className="shrink-0">
                      <DriveIcon d={d} />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{d.title}</span>
                    <span className="text-[10.5px] text-ink-400 tabular-nums">{fa(driveCount(d))}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card p-3 space-y-1.5" aria-label="فضای مصرفی">
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="text-ink-700 font-medium truncate">فضای {quotaDrive.title}</span>
              <span className="text-ink-400 tabular-nums shrink-0">{fa(usedPct)}٪</span>
            </div>
            <span className="block h-1.5 rounded-full bg-ink-100 overflow-hidden" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100}>
              <span className={`block h-full rounded-full ${usedPct >= 90 ? "bg-rose-500" : usedPct >= 70 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${Math.max(usedPct, 1.5)}%` }} />
            </span>
            <p className="text-[10.5px] text-ink-400">
              {fmtBytes(used)} از {fmtBytes(quota)} · نسخه‌های قبلی و سطل بازیافت هم حساب می‌شوند
            </p>
          </div>
          <Link to="/dashboard/project-teams" className="card p-3 flex items-center gap-2.5 hover:border-brand-300 group">
            <span className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
              <Briefcase size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium text-ink-800 group-hover:text-brand-700">اسناد پروژه‌های من</span>
              <span className="block text-[10.5px] text-ink-400">اسناد پروژه در ماژول مدیریت پروژه</span>
            </span>
            <ChevronLeft size={14} className="text-ink-300" />
          </Link>
        </aside>

        {/* ---------------------------------------------------- اخیر / ستاره‌دار / سطل بازیافت */}
        {view !== "drive" && (
          <section className="card min-w-0">
            <div className="p-3 border-b border-ink-100 flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-bold text-ink-900 flex-1 min-w-0">
                {view === "recent" ? "فایل‌هایی که اخیراً باز یا بارگذاری کرده‌اید" : view === "starred" ? "فایل‌های ستاره‌دار" : view === "shared" ? "اشتراک‌گذاشته با من — از گروه‌ها، کانال‌ها و لینک‌هایی که شما را نام برده‌اند" : `سطل بازیافت — تا ${fa(TRASH_DAYS)} روز قابل بازگردانی`}
              </p>
              {view === "trash" && trashFiles.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={13} />}
                  className="!text-rose-600"
                  onClick={() =>
                    confirm({
                      title: "خالی کردن سطل بازیافت؟",
                      message: `${fa(trashFiles.length)} فایل برای همیشه حذف می‌شود و قابل بازگردانی نیست.`,
                      confirmLabel: "حذف دائم",
                      onConfirm: () => {
                        trashFiles.forEach((f) => s.purgeFile(f.id));
                        notify("سطل بازیافت خالی شد.", "info");
                      },
                    })
                  }
                >
                  خالی کردن سطل
                </Button>
              )}
            </div>
            {view === "shared" ? (
              sharedFiles.length === 0 ? (
                <div className="py-10">
                  <EmptyState icon={<Share2 size={22} />} title="فایلی با شما به اشتراک گذاشته نشده" description="فایل‌های گروه‌ها و کانال‌هایتان و لینک‌هایی که دیگران برایتان می‌سازند اینجا جمع می‌شوند." />
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {sharedFiles.map(({ f, via }) => {
                    const I = fileIcon(f.mime);
                    return (
                      <li key={f.id} className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5">
                        <I size={18} className="text-brand-600 shrink-0" />
                        <button onClick={() => openPreview(f)} className="flex-1 min-w-0 text-right">
                          <span className="block text-[13px] text-ink-800 hover:text-brand-700 truncate">{f.name}</span>
                          <span className="block text-[10.5px] text-ink-400 truncate">
                            {via.label} · {f.size} · {stamp(via.when)}
                          </span>
                        </button>
                        {f.owner_type === "user" && <Badge tone="success" icon={<Link2 size={10} />}>لینک</Badge>}
                        {fileActions(f)}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : view === "trash" ? (
              trashFiles.length === 0 ? (
                <div className="py-10">
                  <EmptyState icon={<Trash2 size={22} />} title="سطل بازیافت خالی است" description="فایل‌های حذف‌شده تا ۳۰ روز اینجا می‌مانند." />
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {trashFiles.map((f) => {
                    const I = fileIcon(f.mime);
                    const left = TRASH_DAYS - ageDays(f.trashed_at);
                    return (
                      <li key={f.id} className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5">
                        <I size={18} className="text-ink-400 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] text-ink-800 truncate">{f.name}</span>
                          <span className="block text-[10.5px] text-ink-400 truncate">
                            {driveTitle(f)} · {f.size} · حذف {stamp(f.trashed_at)} ·{" "}
                            <span className={left <= 5 ? "text-rose-600" : ""}>{left > 0 ? `${fa(left)} روز تا حذف دائم` : "مهلت تمام شده"}</span>
                          </span>
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          {left > 0 && (
                            <IconBtn
                              onClick={() => {
                                const r = s.restoreFile(f.id);
                                notify(r.ok ? `«${f.name}» بازگردانده شد.` : r.error, r.ok ? "success" : "warning");
                              }}
                              title="بازگردانی"
                            >
                              <RotateCcw size={14} />
                            </IconBtn>
                          )}
                          <IconBtn
                            onClick={() =>
                              confirm({
                                title: `حذف دائم «${f.name}»؟`,
                                message: "قابل بازگردانی نیست.",
                                confirmLabel: "حذف دائم",
                                onConfirm: () => {
                                  s.purgeFile(f.id);
                                  notify("فایل برای همیشه حذف شد.", "info");
                                },
                              })
                            }
                            title="حذف دائم"
                            danger
                          >
                            <X size={14} />
                          </IconBtn>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (view === "recent" ? recentFiles : starredFiles).length === 0 ? (
              <div className="py-10">
                <EmptyState icon={view === "recent" ? <Clock size={22} /> : <Star size={22} />} title={view === "recent" ? "فایل اخیری نیست" : "هنوز فایلی را ستاره‌دار نکرده‌اید"} description={view === "starred" ? "با ستاره‌ی کنار هر فایل، آن را اینجا نگه دارید." : undefined} />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {(view === "recent" ? recentFiles : starredFiles).map((f) => {
                  const I = fileIcon(f.mime);
                  return (
                    <li key={f.id} className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5">
                      <I size={18} className="text-brand-600 shrink-0" />
                      <button onClick={() => openPreview(f)} className="flex-1 min-w-0 text-right">
                        <span className="block text-[13px] text-ink-800 hover:text-brand-700 truncate">{f.name}</span>
                        <span className="block text-[10.5px] text-ink-400 truncate">
                          {driveTitle(f)} · {f.size} · {view === "recent" ? stamp(lastTouch(f)) : stamp(f.created_at)}
                        </span>
                      </button>
                      {fileActions(f)}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ---------------------------------------------------- محتوای درایو */}
        {view === "drive" && (
        <section className="card min-w-0">
          {/* نوار ابزار */}
          <div className="p-3 border-b border-ink-100 flex flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[12.5px] min-w-0 flex-1 flex-wrap">
              <button onClick={() => setFolderId(null)} className={`flex items-center gap-1 ${cwd ? "text-ink-500 hover:text-brand-700" : "text-ink-900 font-medium"}`}>
                <Home size={13} /> {drive.title}
              </button>
              {crumbs.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1 min-w-0">
                  <ChevronLeft size={12} className="text-ink-300 shrink-0" />
                  <button onClick={() => setFolderId(c.id)} className={`truncate max-w-[140px] ${i === crumbs.length - 1 ? "text-ink-900 font-medium" : "text-ink-500 hover:text-brand-700"}`}>
                    {c.name}
                  </button>
                </span>
              ))}
              {drive.type !== "user" && !canWrite && (
                <Badge tone="neutral" icon={<Lock size={10} />}>
                  فقط خواندنی
                </Badge>
              )}
            </nav>
            <div className="relative w-full sm:w-52">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input-field !pr-8 !py-1.5" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در این درایو…" />
              {q && (
                <button onClick={() => setQ("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400" aria-label="پاک کردن جستجو">
                  <X size={12} />
                </button>
              )}
            </div>
            {canWrite && (
              <div className="flex items-center gap-2">
                <Button size="sm" icon={<FolderPlus size={14} />} onClick={openNew}>
                  پوشه‌ی جدید
                </Button>
                <Button size="sm" variant="primary" icon={<Upload size={14} />} onClick={() => fileInput.current?.click()}>
                  بارگذاری
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) upload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          {/* فهرست — با کشیدن و رها کردن */}
          <div
            onDragOver={(e) => {
              if (!canWrite) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              upload(e.dataTransfer.files);
            }}
            className={`relative min-h-[260px] ${over ? "bg-brand-50/60 outline-2 outline-dashed outline-brand-300 -outline-offset-4" : ""}`}
          >
            {term && <p className="text-[11px] text-ink-400 px-4 pt-3">نتایج جستجوی «{term}» در کل درایو</p>}
            {empty ? (
              <div className="py-10">
                <EmptyState icon={<Folder size={22} />} title={term ? "موردی پیدا نشد" : "این پوشه خالی است"} description={canWrite && !term ? "فایل‌ها را همین‌جا بکشید و رها کنید یا از دکمه‌ی «بارگذاری» استفاده کنید." : undefined} />
              </div>
            ) : (
              <>
                {/* دسکتاپ: جدول */}
                <table className="w-full text-[12.5px] hidden md:table">
                  <thead>
                    <tr className="text-[11px] text-ink-400 border-b border-ink-100">
                      <th className="text-right font-medium px-4 py-2">نام</th>
                      <th className="text-right font-medium px-2 py-2 w-24">حجم</th>
                      <th className="text-right font-medium px-2 py-2 w-44">بارگذاری/ایجاد</th>
                      <th className="text-right font-medium px-2 py-2 w-32">تاریخ</th>
                      <th className="w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {shownFolders.map((f) => {
                      const c = countInside(f.id);
                      return (
                        <tr key={f.id} className="hover:bg-ink-50 cursor-pointer" onClick={() => openFolder(f)}>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <Folder size={16} className="text-amber-500 shrink-0" />
                              <span className="min-w-0">
                                <span className="block truncate text-ink-900 font-medium">{f.name}</span>
                                {term && <span className="block text-[10.5px] text-ink-400 truncate">{folderPath(f.parent_id)}</span>}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-ink-400">{c.files ? `${fa(c.files)} فایل` : "—"}</td>
                          <td className="px-2 py-2">
                            <UserLine id={f.created_by_user_id} size={20} />
                          </td>
                          <td className="px-2 py-2 text-ink-500">{stamp(f.updated_at)}</td>
                          <td className="px-2 py-2">{folderActions(f)}</td>
                        </tr>
                      );
                    })}
                    {shownFiles.map((f) => {
                      const I = fileIcon(f.mime);
                      return (
                        <tr key={f.id} className="hover:bg-ink-50">
                          <td className="px-4 py-2">
                            <button onClick={() => openPreview(f)} className="flex items-center gap-2 min-w-0 text-right">
                              <I size={16} className="text-brand-600 shrink-0" />
                              <span className="min-w-0">
                                <span className="truncate text-ink-800 hover:text-brand-700 flex items-center gap-1">
                                  {f.name}
                                  {shareAlive(f, s.today) && <Link2 size={12} className="text-emerald-600 shrink-0" aria-label="لینک اشتراک فعال" />}
                                  {(f.version ?? 1) > 1 && <span className="text-[10px] text-ink-400 shrink-0">نسخه‌ی {fa(f.version ?? 1)}</span>}
                                </span>
                                {term && <span className="block text-[10.5px] text-ink-400 truncate">{folderPath(f.folder_id)}</span>}
                              </span>
                            </button>
                          </td>
                          <td className="px-2 py-2 text-ink-500 whitespace-nowrap">{f.size}</td>
                          <td className="px-2 py-2">
                            <UserLine id={f.created_by_user_id} size={20} />
                          </td>
                          <td className="px-2 py-2 text-ink-500">{stamp(f.created_at)}</td>
                          <td className="px-2 py-2">{fileActions(f)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* موبایل: فهرست */}
                <ul className="md:hidden divide-y divide-ink-100">
                  {shownFolders.map((f) => (
                    <li key={f.id} className="flex items-center gap-2.5 px-3 py-2.5" onClick={() => openFolder(f)}>
                      <Folder size={18} className="text-amber-500 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-ink-900 font-medium truncate">{f.name}</span>
                        <span className="block text-[10.5px] text-ink-400 truncate">
                          {term ? folderPath(f.parent_id) : `${fa(countInside(f.id).files)} فایل · ${stamp(f.updated_at)}`}
                        </span>
                      </span>
                      {folderActions(f)}
                    </li>
                  ))}
                  {shownFiles.map((f) => {
                    const I = fileIcon(f.mime);
                    return (
                      <li key={f.id} className="flex items-center gap-2.5 px-3 py-2.5">
                        <I size={18} className="text-brand-600 shrink-0" />
                        <button onClick={() => openPreview(f)} className="flex-1 min-w-0 text-right">
                          <span className="block text-[13px] text-ink-800 truncate">{f.name}</span>
                          <span className="block text-[10.5px] text-ink-400 truncate">
                            {f.size} · {s.userName(f.created_by_user_id)} · {stamp(f.created_at)}
                          </span>
                        </button>
                        {fileActions(f)}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          <div className="px-4 py-2 border-t border-ink-100 text-[11px] text-ink-400 flex flex-wrap gap-x-3">
            <span>
              {fa(shownFolders.length)} پوشه · {fa(shownFiles.length)} فایل
            </span>
            {drive.type !== "user" && <span>{canWrite ? "شما مدیر این " + (drive.type === "group" ? "گروه" : "کانال") + " هستید." : "اعضا فقط مشاهده و دریافت می‌کنند؛ بارگذاری و ویرایش با مدیران است."}</span>}
          </div>
        </section>
        )}
      </div>

      {previewFile && <FilePreview key={previewFile.id} fileId={previewFile.id} canWrite={writeIn(previewFile)} onClose={() => setPreviewId(null)} />}

      {/* ---------------------------------------------------- پوشه‌ی جدید / تغییر نام */}
      <Modal open={!!nameModal} onClose={() => setNameModal(null)} title={nameModal?.mode === "rename" ? "تغییر نام پوشه" : "پوشه‌ی جدید"} description={nameModal?.mode === "rename" ? undefined : `در «${folderPath(cwd)}» — ${drive.title}`}>
        <div className="space-y-4">
          <Field label="نام پوشه (name)">
            <input className="input-field" autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveName}>
              {nameModal?.mode === "rename" ? "ذخیره" : "ساخت پوشه"}
            </Button>
            <Button variant="ghost" onClick={() => setNameModal(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---------------------------------------------------- انتقال پوشه */}
      <Modal open={!!moveOf} onClose={() => setMoveOf(null)} title={`انتقال «${moveOf?.name ?? ""}»`} description="پوشه‌ی مقصد را انتخاب کنید (parent_id).">
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto border border-ink-200 rounded-lg divide-y divide-ink-100">
            {[{ id: "", label: `ریشه‌ی ${drive.title}` }, ...moveOptions.map((f) => ({ id: f.id, label: folderPath(f.id) }))].map((o) => (
              <label key={o.id || "root"} className={`flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer ${moveTarget === o.id ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
                <input type="radio" name="move-target" checked={moveTarget === o.id} onChange={() => setMoveTarget(o.id)} className="accent-[var(--color-brand-600)]" />
                {o.id ? <Folder size={14} className="text-amber-500" /> : <Home size={14} className="text-ink-400" />}
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={doMove} disabled={(moveOf?.parent_id ?? "") === moveTarget}>
              انتقال
            </Button>
            <Button variant="ghost" onClick={() => setMoveOf(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
