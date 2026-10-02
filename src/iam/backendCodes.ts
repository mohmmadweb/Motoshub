// ---------------------------------------------------------------------------
// هم‌ترازی کد مجوزهای دمو با کاتالوگ واقعی بک‌اند Identity (motonext2.shub.ir)
// منبع: GET /api/identity/admin?tenant_id=2 → catalogue (contract_version 3.0) — ۵۸ کد در
// دو اپلیکیشن identity و workspace. (فقط‌خواندنی دریافت شد؛ ۱۴۰۵/۰۷/۱۰)
// هر مجوز دمو → کد بک‌اند، یا null + «پیشنهاد افزودن به بک‌اند».
// جدول خوانا: docs/PERMISSION_MAPPING.md
// ---------------------------------------------------------------------------

export type BackendApp = "identity" | "workspace";

/** کاتالوگ بک‌اند — [کد، نام] */
export const BACKEND_CATALOGUE: [string, string][] = [
  ["identity.iam.audit.view", "View authorization audit events"],
  ["identity.iam.binding.manage", "Manage scoped role bindings"],
  ["identity.iam.entitlement.manage", "Manage application entitlements"],
  ["identity.iam.membership.manage", "Manage memberships"],
  ["identity.iam.role.manage", "Manage roles and role permissions"],
  ["identity.iam.scope_schema.manage", "Manage tenant scope schemas"],
  ["identity.iam.tenant.manage", "Manage tenants and scopes"],
  ["identity.iam.tenant.view", "View tenants"],
  ["workspace.knowledge.configuration.view", "View knowledge configuration"],
  ["workspace.knowledge.document.add_version", "Add knowledge document versions"],
  ["workspace.knowledge.document.create", "Create knowledge documents"],
  ["workspace.knowledge.document.delete", "Delete knowledge documents"],
  ["workspace.knowledge.document.download", "Download knowledge documents"],
  ["workspace.knowledge.document.publish", "Publish knowledge documents"],
  ["workspace.knowledge.document.update", "Update knowledge documents"],
  ["workspace.knowledge.document.view", "View knowledge documents"],
  ["workspace.knowledge.profile.create", "Create knowledge profiles"],
  ["workspace.knowledge.profile.delete", "Delete knowledge profiles"],
  ["workspace.knowledge.profile.update", "Update knowledge profiles"],
  ["workspace.knowledge.profile.view", "View knowledge profiles"],
  ["workspace.knowledge.research_progress.create", "Create research progress"],
  ["workspace.knowledge.research_progress.delete", "Delete research progress"],
  ["workspace.knowledge.research_progress.transition", "Transition research progress"],
  ["workspace.knowledge.research_progress.view", "View research progress"],
  ["workspace.projects.expense.manage", "Manage project expenses"],
  ["workspace.projects.expense.view", "View project expenses"],
  ["workspace.projects.meeting.manage", "Manage project meetings"],
  ["workspace.projects.meeting.view", "View project meetings"],
  ["workspace.projects.member.manage", "Manage project members"],
  ["workspace.projects.member.view", "View project members"],
  ["workspace.projects.milestone.manage", "Manage project milestones"],
  ["workspace.projects.milestone.view", "View project milestones"],
  ["workspace.projects.playbook_execution.manage", "Manage playbook executions"],
  ["workspace.projects.playbook_execution.view", "View playbook executions"],
  ["workspace.projects.playbook_step.manage", "Manage playbook steps"],
  ["workspace.projects.playbook_step.view", "View playbook steps"],
  ["workspace.projects.playbook_template.create", "Create playbook templates"],
  ["workspace.projects.playbook_template.delete", "Delete playbook templates"],
  ["workspace.projects.playbook_template.execute", "Execute playbook template"],
  ["workspace.projects.playbook_template.update", "Update playbook templates"],
  ["workspace.projects.playbook_template.view", "View playbook templates"],
  ["workspace.projects.project.create", "Create projects"],
  ["workspace.projects.project.delete", "Delete projects"],
  ["workspace.projects.project.update", "Update projects"],
  ["workspace.projects.project.view", "View projects"],
  ["workspace.projects.risk.manage", "Manage project risks"],
  ["workspace.projects.risk.view", "View project risks"],
  ["workspace.projects.risk_analysis.view", "View project risk analysis"],
  ["workspace.projects.sprint.manage", "Manage sprints"],
  ["workspace.projects.sprint.view", "View sprints"],
  ["workspace.projects.task.assign", "Assign project tasks"],
  ["workspace.projects.task.create", "Create project tasks"],
  ["workspace.projects.task.delete", "Delete project tasks"],
  ["workspace.projects.task.transition", "Transition project tasks"],
  ["workspace.projects.task.update", "Update project tasks"],
  ["workspace.projects.task.view", "View project tasks"],
  ["workspace.projects.task_dependency.manage", "Manage project task dependencies"],
  ["workspace.projects.task_dependency.view", "View project task dependencies"],
];
export const BACKEND_CODES = new Set(BACKEND_CATALOGUE.map(([c]) => c));

export type BackendMapping = {
  /** کد معادل در بک‌اند؛ null = هنوز در کاتالوگ بک‌اند نیست */
  code: string | null;
  /** معادل ناقص است (مثلاً مجوز دمو ریزتر یا درشت‌تر است) */
  partial?: boolean;
  /** سرویس دیگری که این مجوز را پوشش می‌دهد */
  service?: "social";
  /** کد پیشنهادی برای افزودن به بک‌اند */
  suggest?: string;
  note?: string;
};

const I = "identity.iam.";
const K = "workspace.knowledge.";
const P = "workspace.projects.";

const exact: Record<string, string> = {
  "iam.structure.view": `${I}tenant.view`,
  "iam.structure.manage": `${I}tenant.manage`,
  "iam.members.manage": `${I}membership.manage`,
  "iam.audit.view": `${I}audit.view`,
  "roles.create": `${I}role.manage`,
  "roles.edit": `${I}role.manage`,
  "roles.delete": `${I}role.manage`,
  "roles.assign": `${I}binding.manage`,
  "users.block": `${I}membership.manage`,
  "settings.modules": `${I}entitlement.manage`,
  "knowledge.list": `${K}document.view`,
  "knowledge.upload": `${K}document.create`,
  "knowledge.edit": `${K}document.update`,
  "knowledge.delete": `${K}document.delete`,
  "knowledge.approve": `${K}document.publish`,
  "knowledge.download": `${K}document.download`,
  "knowledge.registry": `${K}profile.update`,
  "projects.list": `${P}project.view`,
  "projects.create": `${P}project.create`,
  "projects.edit": `${P}project.update`,
  "projects.delete": `${P}project.delete`,
  "projects.tasks.delete": `${P}task.delete`,
  "projects.members": `${P}member.manage`,
  "projects.expenses": `${P}expense.manage`,
  "projects.risks": `${P}risk.manage`,
  "projects.meetings": `${P}meeting.manage`,
  "projects.playbooks": `${P}playbook_execution.manage`,
};

const partial: Record<string, [string, string]> = {
  "roles.list": [`${I}role.manage`, "بک‌اند مجوز جداگانه‌ی «مشاهده‌ی نقش‌ها» ندارد."],
  "users.list": [`${I}tenant.view`, "فهرست کاربران در پاسخ admin همراه tenant.view می‌آید."],
  "users.create": [`${I}membership.manage`, "ساخت کاربر در بک‌اند = ساخت عضویت."],
  "users.edit": [`${I}membership.manage`, "ویرایش کاربر در بک‌اند از مسیر عضویت."],
  "users.import": [`${I}membership.manage`, "واردسازی دسته‌ای = چند عضویت."],
  "settings.system": [`${I}scope_schema.manage`, "فقط بخش «انواع واحد و قواعد والد/فرزند»."],
  "knowledge.rnd": [`${K}research_progress.transition`, "به‌همراه research_progress.create/delete/view."],
  "knowledge.settings": [`${K}configuration.view`, "بک‌اند فقط مشاهده‌ی پیکربندی دارد؛ ویرایش پیشنهاد می‌شود."],
  "knowledge.experts": [`${K}profile.create`, "شناسنامه‌ی خبرگان در بک‌اند «profile» است."],
  "projects.archive": [`${P}project.update`, "بایگانی در بک‌اند تغییر وضعیت پروژه است."],
  "projects.tasks": [`${P}task.create`, "به‌همراه task.assign و task.update."],
  "projects.progress": [`${P}task.transition`, "ثبت پیشرفت = جابه‌جایی وضعیت وظیفه."],
  "projects.templates": [`${P}playbook_template.update`, "به‌همراه playbook_template.create/delete."],
  "projects.reports": [`${P}risk_analysis.view`, "فقط تحلیل ریسک؛ گزارش‌ساز عمومی پیشنهاد می‌شود."],
};

const SOCIAL_GROUPS = ["members", "relations", "magazines", "news", "media", "forum", "taxonomy", "comments", "chat", "groups", "channels", "events", "files", "social", "blog"];
const suggested: Record<string, string> = {
  "iam.review.manage": `${I}access_review.manage`,
  "iam.impersonate": `${I}impersonation.start`,
  "users.guest": `${I}membership.invite_guest`,
  "projects.expenses.approve": `${P}expense.approve`,
  "projects.budget": `${P}budget.manage`,
  "projects.history": `${P}history.view`,
  "settings.security": `${I}login_policy.manage`,
  "settings.branding": `${I}branding.manage`,
};

/** نگاشت یک مجوز دمو به بک‌اند */
export function backendMapping(id: string): BackendMapping {
  if (exact[id]) return { code: exact[id] };
  if (partial[id]) return { code: partial[id][0], partial: true, note: partial[id][1] };
  const group = id.split(".")[0];
  if (SOCIAL_GROUPS.includes(group)) return { code: null, service: "social", note: "در سرویس شبکه‌ی اجتماعی (social.shub.ir) کنترل می‌شود — خارج از کاتالوگ Identity." };
  const app = id.startsWith("iam.") || id.startsWith("roles.") || id.startsWith("users.") || id.startsWith("settings.") ? "identity.iam." : "workspace.";
  return { code: null, suggest: suggested[id] ?? `${app}${id}`, note: "پیشنهاد افزودن به بک‌اند" };
}

/** فقط کد (برای چیپ کوچک) */
export const backendCodeOf = (id: string) => backendMapping(id).code;

/** کدهای بک‌اند که هیچ مجوز دمویی به آن‌ها نگاشت نشده (برای سند) */
export function unmappedBackendCodes(demoIds: string[]) {
  const used = new Set(demoIds.map((id) => backendMapping(id).code).filter(Boolean) as string[]);
  return BACKEND_CATALOGUE.filter(([c]) => !used.has(c));
}
