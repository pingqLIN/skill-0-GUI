# Skill-0 Review Studio 功能说明

## 核心能力

- 支持主 skill 文件与辅助 context files 的 intake 工作区
- 当本机存在 `skill-0` 时，可走 canonical parser bridge
- 提供 standalone fallback parser，适合公开 demo 与外部审查
- 以 parser 输出为核心的 decomposition board
- 以 findings、traceability、risk framing 为核心的 dashboard 与 security matrix
- 以轻量 semantic review map 作为公开版主视觉界面
- 支持内存内编辑与 `.skill.md` 导出

## 公开版边界

- 公开版不提供交互式 3D 工作区
- 公开版不提供 server-side persistence、共享草稿或多人审查历史
- 若部署仅使用 standalone mode，不应宣称与 canonical parser 完全等价
