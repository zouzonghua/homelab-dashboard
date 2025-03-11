# Homelab Dashboard

一个现代化的家庭服务器仪表盘，帮助你更好地管理和监控你的家庭服务器。

## [在线演示](https://zouzonghua.github.io/homelab-dashboard/)

## 功能特点

- [x] 🎯 一键访问常用服务
- [x] 🌙 支持暗黑模式
- [x] 📱 响应式设计，支持移动端
- [ ] 📊 系统资源监控 (TODO)
- [ ] 🔄 实时服务状态显示 (TODO)
- [ ] 🔧 高度可定制的界面 (TODO)
- [ ] 🔐 安全的身份验证 (TODO)
- [ ] 🐳 docker 部署 (TODO)

## 快速开始

确保你的系统已安装 Node.js (>= 14.x) 和包管理器。

```bash
# 克隆项目
git clone https://github.com/zouzonghua/homelab-dashboard.git

# 进入项目目录
cd homelab-dashboard

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 安装部署

### 手动部署

1. 构建项目

```bash
npm run build
```

2. 将 `dist` 目录下的文件部署到你的 Web 服务器

## 配置说明

配置文件位于 `src/assets/config.json`，你可以根据需要修改以下配置：

```javascript
{
  "title": "zonghua's homelab dashboard", // 标题
  "columns": "4", // 列数
  "items": [
    // 你的服务配置
    {
      "name": "Media", // 服务名称
      "icon": "fa-solid fa-photo-film", // 图标
      "list": [
        {
          "name": "Jellyfin", // 服务名称
          "logo": "assets/icons/jellyfin.png", // 图标或者网络图标
          "url": "http://192.168.1.203:8096", // 链接
          "target": "_blank" // 打开方式
        }
      ]
    },
  ]
}
```

## 技术栈

- 🚀 [Vite](https://vitejs.dev/) - 下一代前端构建工具
- ⚛️ [React 18](https://reactjs.org/) - 用户界面构建库
- 🎨 [TailwindCSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- 🔍 [ESLint](https://eslint.org/) - 代码质量检查工具
- 🎯 [PostCSS](https://postcss.org/) - CSS 转换工具
- 📦 [Autoprefixer](https://github.com/postcss/autoprefixer) - 自动添加 CSS 前缀
- 🎁 [Font Awesome](https://fontawesome.com/) - 图标库

## 贡献指南

欢迎提交 Pull Request 或创建 Issue！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建一个 Pull Request

## 开源协议

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/zouzonghua/homelab-dashboard/blob/main/LICENSE)

Copyright (c) 2021 - Now zouzonghua
