# 开发流程

采用 **main-only + GitHub Flow**：`main` 是唯一长期开发与发布分支，不再使用 `dev`。

1. 从最新 `origin/main` 创建短期分支，例如 `feat/layout-toggle`、`fix/service-status`。
2. 完成修改和相关验证，向 `main` 发起 PR。
3. CI 通过后使用 Squash and merge，合并后删除功能分支。
4. `main` 合并触发 Docker 镜像发布；需要版本发布时再创建版本标签。

不要直接向 `main` 推送，也不要强制推送 `main`。修复同样从 `main` 创建短期分支并通过 PR 合入。

```bash
git fetch origin
git switch -c feat/my-change origin/main
# 修改并验证后提交
git push -u origin feat/my-change
gh pr create --base main
```

提交使用中文 Conventional Commits，说明需求或问题及实现思路。PR 简述改动、原因和验证结果；UI 修改附截图。

前端验证：

```bash
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web run test:e2e
```

后端修改另执行 `go test ./api ./cmd/... ./internal/...`。
