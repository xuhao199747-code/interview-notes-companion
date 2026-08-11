export function getEditionStorageName(edition) {
  // 桌面端曾按启动入口拆成两份资料目录，导致同一快捷键在“刷新/重开”后读取到另一份配置。
  // 本产品只保留一份用户本地资料，所有入口都复用当前本地版目录。
  return "interview-notes-companion-local";
}
