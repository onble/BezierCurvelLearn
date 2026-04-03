const { ccclass, property } = cc._decorator;

@ccclass
export class BezierCurve2 extends cc.Component {

    @property({ type: cc.Node, tooltip: CC_DEV ? '子弹节点' : undefined })
    private bulletNode: cc.Node = null!;

    @property({ type: cc.Node, tooltip: CC_DEV ? '开始节点' : undefined })
    private startPoint: cc.Node = null!;

    @property({ type: cc.Node, tooltip: CC_DEV ? '控制节点1' : undefined })
    private controlPoint: cc.Node = null!;

    @property({ type: cc.Node, tooltip: CC_DEV ? '控制节点2' : undefined })
    private controlPoint2: cc.Node = null!;

    @property({ type: cc.Node, tooltip: CC_DEV ? '结束节点' : undefined })
    private endPoint: cc.Node = null!;

    @property({ type: cc.Graphics, tooltip: CC_DEV ? '绘制画板' : undefined })
    private graphics: cc.Graphics = null!;

    @property({ tooltip: CC_DEV && '是否为二阶贝塞尔曲线', type: cc.Boolean })
    private isTwoOrder: boolean = true;

    @property({ type: cc.Node, tooltip: CC_DEV ? '子弹父节点' : undefined })
    private bulletParent: cc.Node = null!;

    /**
     * 记录上次的开始位置
     */
    private _lastStartPos: cc.Vec2 = new cc.Vec2();
    /**
     * 记录上次的控制点1的位置
     */
    private _lastControlPos: cc.Vec2 = new cc.Vec2();
    /**
     * 记录上次的控制点2的位置
     */
    private _lastControl2Pos: cc.Vec2 = new cc.Vec2();
    /**
     * 记录上次的结束位置
     */
    private _lastEndPos: cc.Vec2 = new cc.Vec2();

    protected onLoad(): void {
        this._drawMoveLine();
        // 监听全局事件
        cc.systemEvent.on('drawline', this._drawMoveLine, this);
        cc.systemEvent.on('arrowMove', this._arrowMove, this);
    }

    protected onDestroy(): void {
        cc.systemEvent.off('drawline', this._drawMoveLine, this);
        cc.systemEvent.off('arrowMove', this._arrowMove, this);
    }


    /**
     * 绘制贝塞尔曲线移动路径
     * 检查控制点位置是否发生变化，如果未变化则跳过绘制
     * 根据 isTwoOrder 标志绘制二阶或三阶贝塞尔曲线
     * @private
     */
    private _drawMoveLine(): void {
        const startPos = this.startPoint.getPosition();
        const endPos = this.endPoint.getPosition();
        const controlPos1 = this.controlPoint.getPosition();
        const controlPos2 = this.controlPoint2.getPosition();

        // 检查位置是否变化，如果未发生变化，则不绘制内容
        if (this.isTwoOrder === true && !this._positionsChange(startPos, controlPos1, endPos)) {
            return;
        } else if (this.isTwoOrder === false && !this._positionsChange(startPos, controlPos1, controlPos2, endPos)) {
            return;
        }

        // 记录当前位置
        this._lastStartPos.set(startPos);
        this._lastControlPos.set(controlPos1);
        this._lastControl2Pos.set(controlPos2);
        this._lastEndPos.set(endPos);

        if (this.isTwoOrder) {
            // 绘制二阶贝塞尔曲线
            this.drawBezierPath(startPos, controlPos1, endPos);
        } else {
            // 绘制三阶贝塞尔曲线
            this.drawBezierPath(startPos, controlPos1, controlPos2, endPos);
        }

    }

    /**
     * 根据当前控制点的位置，启动子弹沿贝塞尔曲线的运动
     * @private
     */
    private _arrowMove(): void {
        const startPos = this.startPoint.getPosition();
        const endPos = this.endPoint.getPosition();
        const controlPos1 = this.controlPoint.getPosition();
        const controlPos2 = this.controlPoint2.getPosition();

        if (this.isTwoOrder) {
            // 绘制二阶贝塞尔曲线
            this.startBezierMovement(this.bulletNode, startPos, controlPos1, endPos);
        } else {
            // 绘制三阶贝塞尔曲线
            this.startCubicBezierMovement(this.bulletNode, startPos, controlPos1, controlPos2, endPos);
        }
    }

    /**
     * 检查贝塞尔曲线的关键点位置是否发生变化
     * @param startPos - 当前起始点坐标
     * @param controlPos - 当前控制点坐标
     * @param endPos - 当前结束点坐标
     * @returns 如果任意关键点位置发生变化则返回 true，否则返回 false
     */
    private _positionsChange(startPos: cc.Vec2, controlPos: cc.Vec2, endPos: cc.Vec2, controlPos2?: cc.Vec2): boolean {
        // 构建当前点和历史点的配对数组
        const positionPairs = [
            [startPos, this._lastStartPos],
            [controlPos, this._lastControlPos],
            [endPos, this._lastEndPos],
        ];

        if (controlPos2) {
            positionPairs.push([controlPos2, this._lastControl2Pos]);
        }

        // 只要有一对不相等，就返回true
        return positionPairs.some(([current, last]) => !current.equals(last));
    }

    /** 绘制贝塞尔曲线路径 */
    private drawBezierPath(p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3?: cc.Vec2) {
        const graphics = this.graphics;

        graphics.clear();

        // 绘制控制线
        this.graphics.lineWidth = 5;
        this.graphics.strokeColor = cc.Color.BLUE;

        // 起点到控制点
        this.graphics.moveTo(p0.x, p0.y);
        this.graphics.lineTo(p1.x, p1.y);
        this.graphics.stroke();

        // 控制点到终点
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);


        this.graphics.stroke();
        this.graphics.strokeColor = cc.Color.BLUE;

        if (p3) {
            // 控制点到终点
            this.graphics.moveTo(p2.x, p2.y);
            this.graphics.lineTo(p3.x, p3.y);

            this.graphics.stroke();
            this.graphics.strokeColor = cc.Color.BLUE;
        }

        this.graphics.strokeColor = cc.Color.GREEN;
        graphics.moveTo(p0.x, p0.y);
        if (p3) {
            graphics.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        } else {
            graphics.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        }
        graphics.stroke();

    }

    //#region 三阶
    /**
     * 沿三次贝塞尔曲线移动节点
     */
    private startCubicBezierMovement(targetNode: cc.Node, startPos: cc.Vec2, control1: cc.Vec2, control2: cc.Vec2, endPos: cc.Vec2): void {
        const tweenObj = { progress: 0 };

        cc.tween(tweenObj)
            .to(1.5, { progress: 1 }, {
                progress: (start: number, end: number, current: undefined, ratio: number) => {
                    const t = start + (end - start) * ratio;
                    // 计算当前位置
                    const position = this.Bezier_Cubic(t, startPos, control1, control2, endPos);
                    targetNode.setPosition(position);

                    // 当前切线
                    const tangent = this.calculateCubicBezierTangent(t, startPos, control1, control2, endPos);
                    // 计算角度（弧度）
                    const angle = Math.atan2(tangent.y, tangent.x);
                    // 转换为度数并设置旋转
                    const degrees = angle * 180 / Math.PI;
                    targetNode.angle = degrees;
                }
            })
            .start();
    }

    /**
     * 三阶贝塞尔曲线计算
     * B(t) = (1-t)³P₀ + 3t(1-t)²P₁ + 3t²(1-t)P₂ + t³P₃
     */
    private Bezier_Cubic(t: number, p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3: cc.Vec2): cc.Vec2 {
        // 确保t在[0,1]范围内
        t = Math.min(Math.max(t, 0), 1);
        // 原式：B(t) = (1-t)³P₀ + 3t(1-t)²P₁ + 3t²(1-t)P₂ + t³P₃
        // 使用中间变量避免重复计算，令u=1-t：B(t) = uuu * P₀ + _3tuu * P₁ + _3ttu * P₂ + ttt * P₃
        const u = 1 - t;
        const uu = u * u;
        const uuu = uu * u;
        const tt = t * t;
        const ttt = tt * t;

        const _3tuu = 3 * t * uu;
        const _3ttu = 3 * tt * u;

        const x = uuu * p0.x + _3tuu * p1.x + _3ttu * p2.x + ttt * p3.x;
        const y = uuu * p0.y + _3tuu * p1.y + _3ttu * p2.y + ttt * p3.y;

        return new cc.Vec2(x, y);
    }

    /**
     * 计算三次贝塞尔曲线在 t 时刻的切线方向
     */
    private calculateCubicBezierTangent(t: number, p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3: cc.Vec2): cc.Vec2 {
        // 三次贝塞尔曲线求导：B'(t) = 3(1-t)²(P₁-P₀) + 6t(1-t)(P₂-P₁) + 3t²(P₃-P₂)
        const u = 1 - t;
        const uu = u * u;
        const tt = t * t;

        const dx = 3 * uu * (p1.x - p0.x) + 6 * t * u * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
        const dy = 3 * uu * (p1.y - p0.y) + 6 * t * u * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);

        return new cc.Vec2(dx, dy).normalize();
    }
    //#endregion 三阶

    //#region 二阶
    /**
     * 使用二次贝塞尔曲线控制节点沿曲线运动，同时根据切线方向调整节点角度
     * @param {cc.Node} targetNode - 需要移动的目标节点
     * @param {cc.Vec2} startPos - 贝塞尔曲线的起始位置
     * @param {cc.Vec2} control1 - 贝塞尔曲线的控制点
     * @param {cc.Vec2} endPos - 贝塞尔曲线的结束位置
     * @param {() => void} [onComplete] - 动画完成时的回调函数
     * @returns {void}
     */
    private startBezierMovement(targetNode: cc.Node, startPos: cc.Vec2, control1: cc.Vec2, endPos: cc.Vec2, onComplete?: () => void): void {

        // 使用虚拟对象进行tween
        const tweenObj = { progress: 0 };

        cc.tween(tweenObj)
            .to(1, { progress: 1 }, {
                progress: (start: number, end: number, current: undefined, ratio: number) => {
                    const t = start + (end - start) * ratio;
                    // 计算当前位置
                    const position = this.Bezier_Quadratic(t, startPos, control1, endPos);
                    targetNode.setPosition(position);

                    // 当前切线
                    const tangent = this.calculateQuadraticBezierTangent(t, startPos, control1, endPos);
                    // 计算角度（弧度）
                    const angle = Math.atan2(tangent.y, tangent.x);
                    // 转换为度数并设置旋转
                    const degrees = angle * 180 / Math.PI;
                    targetNode.angle = degrees;
                }
            })
            .call(() => {
                onComplete?.();
            })
            .start();
    }

    /**
     * 计算二次贝塞尔曲线上给定参数 t 的点坐标
     * @param {number} t - 插值参数，范围 [0, 1]，表示在曲线上的位置
     * @param {cc.Vec2} p0 - 曲线的起始控制点
     * @param {cc.Vec2} p1 - 曲线的中间控制点
     * @param {cc.Vec2} p2 - 曲线的结束控制点
     * @returns {cc.Vec2} 曲线上对应参数 t 的点坐标
     */
    private Bezier_Quadratic(t: number, p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2): cc.Vec2 {
        // 确保t在[0,1]范围内
        t = Math.min(Math.max(t, 0), 1);
        // 原式：B(t) = (1-t)²P₀ + 2t(1-t)P₁ + t²P₂
        // 使用中间变量避免重复计算，令u=1-t：B(t) = uu * P₀ + _2tu * P₁ + tt * P₂
        const u = 1 - t;
        const uu = u * u;
        const tt = t * t;
        const _2tu = 2 * t * u;
        // 计算x, y, z坐标
        const x = uu * p0.x + _2tu * p1.x + tt * p2.x;
        const y = uu * p0.y + _2tu * p1.y + tt * p2.y;

        return new cc.Vec2(x, y);
    }

    /**
     * 计算二次贝塞尔曲线在参数 t 处的切线向量
     * @param {number} t - 曲线参数，取值范围 [0, 1]
     * @param {cc.Vec2} p0 - 曲线的起始控制点
     * @param {cc.Vec2} p1 - 曲线的控制点
     * @param {cc.Vec2} p2 - 曲线的结束控制点
     * @returns {cc.Vec2} 归一化后的切线向量
     */
    private calculateQuadraticBezierTangent(t: number, p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2): cc.Vec2 {
        // 二次贝塞尔曲线
        // 原式：B(t) = (1-t)²P₀ + 2t(1-t)P₁ + t²P₂
        // 求导：B'(t) = 2(1-t)(P₁-P₀) + 2t(P₂-P₁)
        const u = 1 - t;
        const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
        const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);

        return new cc.Vec2(dx, dy).normalize();
    }
    //#endregion 二阶

    /**
     * 生成随机控制点并创建子弹节点进行贝塞尔曲线运动
     * @returns {cc.Vec2} 生成的控制点坐标
     */
    private _randomPoint(): cc.Vec2 {
        // 计算中点
        const midPoint = this.startPoint.getPosition().clone().lerp(this.endPoint.getPosition(), 0.5);
        // 计算方向向量（从起点到终点）
        const direction = this.endPoint.getPosition().clone().subtract(this.startPoint.getPosition()).normalize();
        // 计算垂直向量（垂直于连接线）
        const perpendicular = new cc.Vec2(-direction.y, direction.x).normalize();
        // 在垂直方向上随机偏移（实际上我们只需要上下方向，所以用(0,1,0)或者计算出的垂直向量）
        const randomHeight = Math.random() * 1200 - 600;
        // 控制点位于中点正上方（或正下方）的垂直线上
        const control1 = midPoint.clone().add(new cc.Vec2(0, randomHeight));

        const newNode = cc.instantiate(this.bulletNode);
        newNode.parent = this.bulletParent;

        this.startBezierMovement(newNode, this.startPoint.getPosition(), control1, this.endPoint.getPosition(), () => {
            this.scheduleOnce(() => {
                newNode.destroy();
            }, 1);
        });
        return control1;
    }

    /**
     * 绘制多条随机二次贝塞尔曲线
     * @private
     * @returns {void}
     */
    private _manyPoints() {
        const graphics = this.graphics;
        graphics.clear();
        for (let i = 0; i < 10; i++) {
            graphics.moveTo(this.startPoint.x, this.startPoint.y);
            const control1 = this._randomPoint();
            graphics.quadraticCurveTo(control1.x, control1.y, this.endPoint.x, this.endPoint.y);
        }
        graphics.stroke();
    }

    /**
     * 清空图形并随机生成多个雪点
     * 通过清除现有图形，并在随机延迟后调用随机点生成方法来创建雪点效果
     */
    private _snowPoints() {
        const graphics = this.graphics;
        graphics.clear();
        // 去掉辅助线，再随机起始时间
        for (let i = 0; i < 10; i++) {
            this.scheduleOnce(() => {
                this._randomPoint();
            }, Math.random() * 1);
        }
    }

    //#region 事件监听
    private onClickManyPoints(): void {
        this._manyPoints();
    }

    private onClickSnowPoints(): void {
        this._snowPoints();
    }
    //#region 事件监听
}
