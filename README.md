# DataMind-Doc

[DataMind](https://github.com/your-org/DataMind) 的文档站点，基于 [VuePress 2](https://vuepress.vuejs.org/) + [vuepress-theme-plume](https://theme-plume.vuejs.press/) 构建。

## Install

```sh
npm i
```

## Usage

```sh
# 启动开发服务（热更新，编辑 markdown 后自动刷新）
npm run docs:dev

# 构建生产包（上传 GitHub Pages 前测试有无 bug）
npm run docs:build

# 本地预览生产服务
npm run docs:preview
```

## 文档结构

```
docs/
├── en/notes/guide/          # 英文文档
│   ├── basicinfo/           #   简介、安装、架构
│   ├── modules/             #   RAG、GraphRAG、Database、Skills、Memory
│   ├── benchmark/           #   测评运行、答案评估
│   └── advanced/            #   配置说明、数据格式
├── zh/notes/guide/          # 中文文档（同上镜像结构）
└── .vuepress/
    ├── config.ts            # VuePress 主配置
    ├── plume.config.ts      # 主题配置（热更新）
    ├── navbars/             # 导航栏配置
    └── notes/               # 侧边栏配置
```

英文和中文文档一一对应，内容保持一致。

## Markdown Frontmatter

每个 Markdown 文件头部的配置：

```yaml
---
title: 页面标题          # 侧边栏显示的标题
icon: carbon:idea        # 侧边栏小图标（从 https://icon-sets.iconify.design/ 选取）
permalink: /zh/guide/... # 永久链接（不能与其他页面重复）
---
```

## 部署到 GitHub Pages

参见 [VuePress 部署文档](https://vuepress.vuejs.org/guide/deployment.html)。

关键配置：

1. `docs/.vuepress/config.ts` 中 `base` 设为 `'/DataMind-Doc/'`（或你的 repo 名）
2. GitHub 仓库 → Settings → Pages → Source 选 `Deploy from a branch` → `gh-pages`

## References

- [VuePress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
