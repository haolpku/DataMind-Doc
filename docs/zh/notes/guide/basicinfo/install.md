---
title: 安装
icon: material-symbols-light:download-rounded
permalink: /zh/guide/basicinfo/install/
createTime: 2026/03/23 00:55:54
---

# 安装

## 前置要求

- Python 3.10+
- [Conda](https://docs.conda.io/)（推荐）或其他 Python 虚拟环境
- 一个 OpenAI 兼容的 API Key（OpenAI、DeepSeek、智谱等）

## 安装步骤

```bash
# 1. 创建并激活环境
conda create -n datamind python=3.12
conda activate datamind

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 API Key 和 API Base
```

## 配置

编辑 `.env` 文件：

```bash
# LLM — 支持任何 OpenAI 兼容 API
LLM_API_BASE=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=deepseek-chat

# Embedding
EMBEDDING_API_BASE=https://api.deepseek.com/v1
EMBEDDING_API_KEY=sk-xxx
EMBEDDING_MODEL=text-embedding-3-small
```

详细配置项参见 [配置说明](../advanced/config.md)。

## 运行

### 方式一：Web 界面（推荐）

```bash
python server.py
```

打开浏览器访问 **http://localhost:8000**

### 方式二：终端命令行

```bash
python main.py
```

首次运行会自动构建向量索引和知识图谱（需要调用 API），后续启动会直接加载已有索引。

## 兼容的 API 服务

| 服务 | api_base | 模型示例 |
|------|----------|---------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 月之暗面 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
