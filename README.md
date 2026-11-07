# Ekko 皮肤管理器 · 旧版兼容入口

**主题管理功能已整合到新版主题中。** 新用户请直接安装 [初音未来主题](https://github.com/cjjchina3088191870-sudo/dsh-plugin-miku-theme)，主题内已包含管理界面、手机导航、外观设置和启动视频功能。

本仓库保留旧版兼容与迁移说明。新版主题可独立使用，安装其他兼容主题后，会自动纳入同一管理界面。

## 使用新版主题

适配 DSH 0.2.2-rc.1：

```sh
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-miku-theme#main
```

重启 DSH 并刷新网页，进入 **账号菜单 → 设置 → Ekko 皮肤** 即可使用。

电脑与手机可以分别上传启动视频，支持 MP4 / WebM、预览、声音控制与不同画面比例。完整介绍和主题预览请查看 [初音未来主题仓库](https://github.com/cjjchina3088191870-sudo/dsh-plugin-miku-theme#readme)。

## 已安装独立管理器的用户

移除独立管理器，再安装当前主题版本：

```sh
dsh plugin --profile web remove dsh-plugin-ekko-skin-manager
dsh plugin --profile web add github:cjjchina3088191870-sudo/dsh-plugin-miku-theme#main
```

完成后重启 DSH 并刷新网页。主题偏好和已保存的视频会保留；使用其他 profile 时，将 `web` 替换为对应名称。

独立管理器 0.2.x 与新版主题可以共用管理界面，但日常使用只安装主题即可。

## 许可

代码采用 [MIT 许可证](LICENSE)，第三方组件条款见 [第三方许可](THIRD_PARTY_LICENSES)。
