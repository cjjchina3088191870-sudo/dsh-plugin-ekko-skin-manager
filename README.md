# Ekko 皮肤管理器 · DeepSeek Harness

在 DeepSeek Harness 中切换初音未来、有菜玫瑰和默认外观，统一管理手机导航、人物装饰与背景浓度。

## 功能

- 在已安装的主题之间切换，随时恢复默认外观。
- 分别保存每款主题的装饰和导航偏好。
- 开关欢迎页装饰、对话人物背景与照片，调整背景浓度。
- 手机可选左上角按钮与抽屉，或左侧纵向图标栏。
- 切换主题时保留会话和输入草稿。

## 安装

适配 DSH 0.2.2-rc.1。搭配初音主题一起安装：

```sh
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-ekko-skin-manager#main github:cjjchina3088191870-sudo/dsh-plugin-miku-theme#main
```

已经安装主题时，也可以单独安装管理器：

```sh
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-ekko-skin-manager#main
```

安装后重启 DSH 并刷新网页。使用其他 profile 时，将命令中的 `web` 替换为对应名称。

## 使用

1. 打开 **账号菜单 → 设置 → Ekko 皮肤**。
2. 选择已安装的主题。
3. 按喜好调整人物、照片、背景浓度和手机导航方式。

选择 **原生界面** 即可恢复默认外观。每款主题的偏好会分别记住，下次切换回来时继续使用。

[查看初音主题效果](https://github.com/cjjchina3088191870-sudo/dsh-plugin-miku-theme#预览)

## 更新

```sh
dsh plugin --profile web update dsh-plugin-ekko-skin-manager
```

更新后重启 DSH 并刷新网页。

## 许可

代码采用 [MIT 许可证](LICENSE)，第三方组件条款见 [第三方许可](THIRD_PARTY_LICENSES)。
