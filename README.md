# Daily GitHub Log

[![Daily snapshot](https://github.com/liguozheng-ac/daily-github-log/actions/workflows/daily-snapshot.yml/badge.svg)](https://github.com/liguozheng-ac/daily-github-log/actions/workflows/daily-snapshot.yml)

每天自动保存公开 GitHub 仓库的状态快照，包括默认分支最新提交、星标、fork 和开放 issue/PR 数量。

这些提交由 GitHub Actions 自动生成，用于记录仓库状态，不代表当天的人工编码工作。

- 时区：Asia/Shanghai（北京时间）。
- 每天 09:17 执行，15:17 和 21:17 补查；当天已有快照时跳过，不重复提交。
- 快照保存在 `snapshots/YYYY/MM/YYYY-MM-DD.json`，不采集私有仓库。
- 使用仓库自带的 `GITHUB_TOKEN`，无需额外密钥，提交邮箱为账号的 GitHub noreply 地址。
- 在 Actions → Daily snapshot → Run workflow 可以手动运行；Disable workflow 可以停止。

GitHub 定时任务可能延迟或被跳过，因此不能保证永久零漏日。公开仓库连续 60 天没有活动时，定时工作流也可能被停用；可在 Actions 页面重新启用。贡献图更新可能需要 24 小时。

本地运行（Node.js 20 或更高版本）：

```sh
node scripts/daily-snapshot.mjs
```

只生成实际运行当天的快照，不回填历史日期。
