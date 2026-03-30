# DataMind-Doc

[DataMind](https://github.com/your-org/DataMind) 的文档站点，使用 [VuePress 2](https://vuepress.vuejs.org/) 和 [vuepress-theme-plume](https://theme-plume.vuejs.press/) 构建。

## 安装

```sh
npm i
```

## 使用

```sh
# 启动开发服务
npm run docs:dev
# 构建生产包
npm run docs:build
# 本地预览生产服务
npm run docs:preview
# 更新 vuepress 和主题
npm run vp-update
```

## 部署到 GitHub Pages

1. `settings > Actions > General`，拉到底部，在 `Workflow permissions` 下勾选 `Read and write permissions`
2. `settings > Pages`，`Source` 选择 `Deploy from a branch`，`Branch` 选择 `gh-pages`
3. 修改 `docs/.vuepress/config.ts` 中的 `base` 为 `"/<REPO>/"`

## 参考

- [VuePress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
