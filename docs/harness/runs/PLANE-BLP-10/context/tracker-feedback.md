# Tracker Feedback

## Review Gate

- State: Ready to Merge
- Labels: agent-ready, cdp-required, enhancement

## Human Comments

### Comment 1

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-28T23:17:49.286225+08:00

接受最新 code review：请在同一 BLP-10 修复拖拽移动后残留 source-line range 的回归，并补充回归覆盖。为避免调试期间过早转人工 Review，implementation 自动修复循环上限已临时从 2 提高到 10；人工最终审核与合并仍保留。

### Comment 2

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-28T22:19:18.525413+08:00

Human feedback — continue BLP-10 implementation.

接受最新 review，请在同一 BLP-10 修复后重审。保持已批准的功能范围；请修复 _sourceLineRanges 的重排后失效问题，纠正实施记录中的 TDD 证据标注，并补足 review 要求的 viewport 验证证据。

### Comment 3

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-28T21:03:33.886144+08:00

Human feedback — continue BLP-10 implementation.

I accept the latest code-review B1 finding: the focused Journal Feed detached/embedded File Outliner must be discoverable by the Alt+Arrow command. This remains within the already approved BLP-10 scope; do not reopen or revise design-intake.

Please resume the same task at implementation, make the narrow command-discovery and real-topology test/runtime correction required by code-review.md, then rerun code review.

Control-plane note: this task was temporarily moved to Review Rejected, which incorrectly routed an enhancement back to design-intake. It has been requeued to Todo. The harness should later distinguish “design rejected” from “accepted code-review feedback requesting an implementation revision”, and reset the revision-loop budget on an explicit human resume.

### Comment 4

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-26T01:13:14.740403+08:00

Code-review retry unblocked: both prior attempts were false positives in the runner command guard because review snapshot hashing mentioned scripts/start-obsidian-debug-env.ps1 as data. The guard now distinguishes reads/hashes from actual launcher execution; all 129 runner tests pass.

### Comment 5

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-26T00:13:57.105469+08:00

BLP-10 automation resumed after repairing the isolated Obsidian launcher: Scoop obsidian.com resolution was replaced with Obsidian.exe, and fresh CDP runtimes now start successfully without a remaining trust prompt.

### Comment 6

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-10T21:45:42.449533+08:00

BLP-10 已为新版 Harness 回归测试重置。旧实现、阶段产物与 trace 已保存为本地可恢复快照；implementation loop 与工作树从当前 BLP master 重新开始。

### Comment 7

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-09T18:03:16.301290+08:00

第二轮 runtime 解阻完成：临时 CDP proof 的不稳定性来自两类跨运行状态泄漏——Promise.race 超时后未取消的异步 cleanup，以及上一轮残留的 zoom/collapsed/visibleNavCache。现改为一次性 vault 的同步最小 cleanup，并在入口归一化 view-local 状态。同一 Obsidian 19225 实例连续两次完整 proof 分别约 4.1s/4.2s 通过，输出一致；未改产品代码。恢复 implementation 重跑。

### Comment 8

- Author: de705fdc-c1ec-4e53-b30d-8509dc7f5bc6
- Created: 2026-08-09T17:48:45.778138+08:00

运行时阻塞已解除（2026-08-09）。确认 BLP-10 专用 Obsidian/CDP 19225 健康；原超时由临时证明脚本自身造成：一处误解 dispatchEvent 在 preventDefault 后返回 false，另一处未在 collapsed 场景后展开 a 就进入 zoom。只修正了 .tmp/PLANE-BLP-10/alt-move-proof.js，未改产品代码。完整 CDP 证明约 30 秒通过：same-level 上下/子树/边界 no-op、cross-level-align 上下及落盘深度、collapsed/zoom 可见范围、焦点/选择/滚动保持全部为 true。现恢复 In Progress，由 runner 重新产出正式 implementation artifact。


## Links

(none)

## Referenced Pages

(none)
