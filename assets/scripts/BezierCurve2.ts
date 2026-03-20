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
    }

    protected onDestroy(): void {
        cc.systemEvent.off('drawline', this._drawMoveLine, this);
    }


    private _drawMoveLine(): void {
        const startPos = this.startPoint.getPosition();
        const endPos = this.endPoint.getPosition();
        const controlPos1 = this.controlPoint.getPosition();

        // 检查位置是否变化，如果未发生变化，则不绘制内容
        if (!this._positionsChange(startPos, controlPos1, endPos)) {
            return;
        }

        // 记录当前位置
        this._lastStartPos.set(startPos);
        this._lastControlPos.set(controlPos1);
        this._lastEndPos.set(endPos);

        // 绘制贝塞尔曲线
        this.drawBezierPath(startPos, controlPos1, endPos);

    }

    /**
     * 检查贝塞尔曲线的关键点位置是否发生变化
     * @param startPos - 当前起始点坐标
     * @param controlPos - 当前控制点坐标
     * @param endPos - 当前结束点坐标
     * @returns 如果任意关键点位置发生变化则返回 true，否则返回 false
     */
    private _positionsChange(startPos: cc.Vec2, controlPos: cc.Vec2, endPos: cc.Vec2): boolean {
        // 构建当前点和历史点的配对数组
        const positionPairs = [
            [startPos, this._lastStartPos],
            [controlPos, this._lastControlPos],
            [endPos, this._lastEndPos]
        ];

        // 只要有一对不相等，就返回true
        return positionPairs.some(([current, last]) => !current.equals(last));
    }

    /** 绘制贝塞尔曲线路径 */
    private drawBezierPath(p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3?: cc.Vec2) {
        const graphics = this.graphics;

        graphics.clear();
        this.graphics.lineWidth = 5;
        this.graphics.strokeColor = cc.Color.BLUE;

        graphics.moveTo(p0.x, p0.y);
        if (p3) {
            graphics.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        } else {
            graphics.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        }
        graphics.stroke();
    }
}
