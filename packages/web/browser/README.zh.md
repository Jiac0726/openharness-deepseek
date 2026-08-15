# @deepseek-ai/dsh-browser

[English](README.md) | 中文

这是交互式浏览器自动化的提供方无关服务定义。`BrowserRuntime` 负责提供方注册和选择；提供方负责浏览器进程及标签页，`dsh-tool-browser` 负责面向模型的工具结构。

## 服务 API

`ctx.browser` 提供 `open`、`tabs`、`navigate`、`snapshot`、`click`、`fill`、`press`、`scroll` 和 `close`。`BrowserTabId` 在跨包调用中是不透明标识。交互节点 ID 仅对对应标签页的最近一次快照有效。

## 模型体验

间接通过 `dsh-tool-browser` 生效；该工具呈现有界页面状态和浏览器操作结果，本注册服务本身不添加提示词或工具结构。

#### KV 缓存影响

不直接导致失效；请求前缀的变化由上述消费者负责。

## 已知限制与延期工作

- **没有提供方观察接口**——仅在执行操作时解析提供方可用性。
