# Ekko 皮肤管理器 · DeepSeek Harness

在 DSH 的 **设置 → Ekko 皮肤** 管理初音未来与有菜玫瑰，支持原生界面、独立装饰偏好和互斥切换。可只安装初音；无需同时安装两款主题。

**Compatible with: dsh 0.2.2-rc.1** · Node.js ≥ 24.9（跟随 DSH）。

## 新用户安装

当前 GitHub 源码为管理器 **0.1.5**、初音 **0.2.4**，包含手机导航和输入框修复。推荐一次安装这两个仓库的 `main`：

```sh
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-ekko-skin-manager#main github:cjjchina3088191870-sudo/dsh-plugin-miku-theme#main
```

重启 DSH 并刷新网页后，全新浏览器默认启用可用主题。通过 **账号菜单 → 设置 → Ekko 皮肤** 切换外观、手机导航、人物与照片、背景浓度。profile 名称不同，请将 `web` 改为实际名称。

只想先安装管理器：

```sh
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-ekko-skin-manager#main
```

没有主题时保留原生界面，管理页面仍可打开，不会卡在加载状态。玫瑰为可选主题，未安装时不会影响初音。明确选择过“原生界面”时会尊重该选择。

首次启动 DSH 时，先在原生“预览版说明”中点击“继续”。主题不附带模型服务；正常对话仍需按 DSH 的流程配置模型和工作区。

## npm 稳定版与安装包

上一次发布到 npm 的固定版本仍可安装，但不包含本次手机导航和输入框修复：

```sh
dsh plugin --profile web add dsh-plugin-ekko-skin-manager@0.1.3 dsh-plugin-miku-theme@0.2.3 --registry=https://registry.npmjs.org
```

从两个仓库的 GitHub Releases 下载先前发布的 `.tgz` 后：

```sh
dsh plugin --profile web add ./dsh-plugin-ekko-skin-manager-0.1.3.tgz ./dsh-plugin-miku-theme-0.2.3.tgz
```

包内含完整构建结果；安装与运行无需 Ekko 源码、私有目录、开发依赖或 `prepare` 脚本。

npm 安装命令指定官方源，避免新版本尚未同步到镜像时出现 `No matching version found`。

## 使用与更新

管理器 0.1.5 配合初音 0.2.4 / 玫瑰 0.2.3 支持 **手机导航方式**，在“设置 → Ekko 皮肤”的主题选项中切换：

- **左上角按钮 + 抽屉**（默认）：用当前主题的星星或玫瑰标记打开原生侧栏。
- **左侧纵向图标栏**：保留新会话、插件、自动化任务、搜索与账号入口，为聊天区域预留 60px。

仅宽度 ≤700px 的竖屏手机生效；横屏和桌面恢复宿主布局。两款主题分别记住选择；切回原生界面完整释放导航和布局标记。抽屉使用原生遮罩、焦点与权限检查，选择新会话或会话条目后收起；不改动宿主的 inert 状态。

每个浏览器保存自己的主题选择，同一浏览器的其他标签页同步。首次加载按实际安装情况选择默认主题；已保存但未安装的主题会回退到可用主题。没有主题时回到原生界面。

窄屏输入框将速度、配额等附加项单独排列，添加、权限、模型、语音和发送按钮保持同排，避免纵向导航导致输入框被撑高。[查看手机效果](https://github.com/cjjchina3088191870-sudo/dsh-plugin-miku-theme#主题效果)。

```sh
dsh plugin --profile web update dsh-plugin-ekko-skin-manager dsh-plugin-miku-theme
```

临时停用装饰时，在管理页面选择 **原生界面**。主题切换保留会话与草稿；不修改模型、账号、订阅或工作区。

## 从旧“皮肤管理”插件迁移

新用户跳过本节。只有之前安装过旧管理器的用户需要迁移。

迁移工具只调整这两个主题及管理器的配置项，会先备份，并停用旧管理器入口；不修改模型、权限或外部挂件。保留旧管理器包作为禁用的兼容项，无需卸载其他皮肤。

在 DSH profile 目录执行（将示例路径替换为自己的 DSH 主目录）：

```sh
node node_modules/dsh-plugin-ekko-skin-manager/lib/migrate.js /你的/DSH主目录 web
```

DSH 主目录通常是用户目录下的 `.dsh`；设置了 `DSH_HOME` 时以它为准。备份位于该目录的 `ekko-skins-backups/`。迁移后刷新网页，使用新的 **设置 → Ekko 皮肤**。

## 工作方式

- 前端只有一个呈现拥有者。预载新素材后，等待旧主题完整卸载，再挂载新主题。
- 资源入口持续存在，切换不关闭后台素材提供者，不会因停用外观而出现失效图片。
- 颜色、CSS、人物、照片、DOM 标记、观察器与草稿桥接随主题释放；原生输入框保留。
- 选择原生界面会清除主题呈现，保留管理入口。两款主题的装饰偏好分别保存。
- 素材加载失败时保留当前正常主题，并提供重试入口。

## 开发

```sh
npm install --ignore-scripts
npm run build
npm test
npm pack
```

`DSH_SKIN_MANAGER_TOOLCHAIN` 仅用于开发时复用 esbuild 与 YAML 工具。发布包内已构建迁移工具及其 YAML 依赖。新增代码采用 MIT，内置 YAML 库许可证见 `THIRD_PARTY_LICENSES/YAML-LICENSE`。
