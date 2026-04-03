# BezierCurveLearn

基于 **Cocos Creator 2.4.10**（`cocos-creator-js`）的贝塞尔曲线学习与演示小项目，在场景中通过拖拽控制点观察曲线形状，并让「子弹」沿曲线运动。

## 环境要求

- [Cocos Creator](https://www.cocos.com/) **2.4.10**（与 `project.json` 中 `version` 一致）

使用对应版本打开本仓库根目录即可。

## 项目结构

| 路径 | 说明 |
|------|------|
| `assets/scenes/Bezier2.fire` | 二阶（二次）贝塞尔曲线场景 |
| `assets/scenes/Bezier3.fire` | 三阶（三次）贝塞尔曲线场景 |
| `assets/scripts/BezierCurve2.ts` | 曲线绘制与沿曲线运动的逻辑 |
| `assets/scripts/Draggable.ts` | 控制点触摸拖拽，触发重绘与发射 |
| `assets/resources/image/Arrow.png` | 子弹/箭头等资源图片 |
| `creator.d.ts` | Cocos Creator 引擎 TypeScript 声明（编辑器生成） |

## 功能说明

### BezierCurve2

- 使用 `cc.Graphics` 绘制**控制折线**（蓝色）与**贝塞尔曲线**（绿色）。
- 通过属性 **`isTwoOrder`** 区分：
  - **二阶**：起点、一个控制点、终点；使用 `quadraticCurveTo` 与二次贝塞尔公式 `Bezier_Quadratic`。
  - **三阶**：起点、两个控制点、终点；使用 `bezierCurveTo` 与三次贝塞尔公式 `Bezier_Cubic`。
- 拖拽结束后发射 **`arrowMove`**，子弹节点沿当前曲线做 **Tween** 运动；根据曲线**切线**旋转节点（二阶/三阶分别有对应求导实现）。
- 监听全局事件 **`drawline`** 在控制点变化时重绘；内部会对比上次位置，未变化则跳过绘制以减轻开销。

### Draggable

- 在节点上响应触摸拖拽，更新本地坐标位置。
- 移动中发出 **`drawline`**，抬起时发出 **`drawline`** 与 **`arrowMove`**，与 `BezierCurve2` 配合。

## 使用方式

1. 用 Cocos Creator 2.4.10 打开项目。
2. 在编辑器中打开 **`Bezier2`** 或 **`Bezier3`** 场景并运行预览。
3. 拖拽场景中的起点、控制点、终点，观察曲线与控制线更新；松手后查看子弹沿曲线运动效果。

## 许可证

本项目采用 [MIT License](LICENSE) 授权。
