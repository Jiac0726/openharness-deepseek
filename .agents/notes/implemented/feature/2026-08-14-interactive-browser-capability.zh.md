# Agent Note: 交互式浏览器能力

Status: implemented

[English](2026-08-14-interactive-browser-capability.md) | 中文

## 问题

Web 搜索和 HTTP 抓取无法操作交互式应用、检查实时控件，也无法在界面操作后验证状态。若把面向模型的工具直接绑定到 Playwright，浏览器进程所有权、提供方替换和导航策略也会混入同一个消费者包。

## 决策

交互式浏览器自动化是独立的 `ctx.browser` 能力，由 Service Definition、Service Provider 和 Consumer 三类包组成。`dsh-browser` 负责品牌化标签页标识、提供方选择、操作约定和共享错误。`dsh-browser-playwright-local` 负责隔离的 Chromium 上下文、标签页生命周期、由 DOM 派生的快照和请求主机过滤。`dsh-tool-browser` 负责一个带判别字段的模型工具，其中各项操作调用该服务。

该能力随 `dsh-base` 安装，但默认停用。profile 或 `--patch` overlay 同时启用服务、提供方和工具，并提供 `blockedHosts`。列表包含要拒绝的精确主机名；空列表允许所有 HTTP 和 HTTPS 主机名。只有提供方已组装且 Host 服务其命名空间时，浏览器控制卡片才会公开同一设置。

快照节点 ID 是临时标识。Playwright 提供方在获取快照时标记可见交互元素，后续节点操作通过这些标记定位。发生交互或导航后，模型选择新元素前必须重新获取快照。

## 考虑过的替代方案

**扩展 `ctx.web`。** 搜索和抓取返回无状态资源，而交互式标签页是带进程所有权和清理过程的实时资源。合并两者会迫使提供方选择和结果类型同时服务于无关的生命周期。

**从工具包直接公开 Playwright。** 这种做法会移除可替换的提供方角色，使后续 CDP、远程浏览器或 Computer Use 实现在保留模型约定时受到阻碍。

**复用 Codex Desktop 浏览器客户端。** 该客户端属于 Codex 应用运行时，不是 DeepSeek Harness 的公共依赖。本能力改用 Playwright 复现可移植的操作模型。

## 后果

DeepSeek Harness Agent 可以通过普通的已记录工具调用检查和操作未被配置主机列表阻止的浏览器页面，Code Mode 也会自动获得同一工具。浏览器状态仅存在于进程内，并在提供方 fiber 释放时消失。首版不持久化认证配置，不提供截图或下载；添加这些功能需要先确定持久附件和呈现规则，不能通过无限扩展快照文本实现。
