/**
 * 重力
 */
const GRAVITY = new cc.Vec2(0, -98);

class RopeNode {

    pos: cc.Vec2 = null;

    prePos: cc.Vec2 = null;

    constructor(x: number, y: number) {
        this.pos = cc.v2(x, y);
        this.prePos = cc.v2(x, y);
    }

    onUpdate(dt: number) {
        const v = cc.Vec2.subtract(new cc.Vec2(), this.pos, this.prePos);
        this.prePos.set(this.pos);
        v.addSelf(cc.Vec2.multiplyScalar(new cc.Vec2(), GRAVITY, dt));
        this.pos.addSelf(v);
    }

}

const { ccclass, property } = cc._decorator;

/**
 * 上边 = 原绳子链（Verlet + 链长约束）；左上角固定，右上角由触摸拉动；
 * 上边上每个节点向下再挂一条竖向绳链（去掉底端锚点），横向再用间距约束连成布。
 */
@ccclass
export class Rope2 extends cc.Component {

    /** nodes[c][r]：列 c 从左到右，行 r 从上（0）到下 */
    nodes: RopeNode[][] = [];

    /** 横向节点数（上边绳子的节点数，>=2） */
    @property({ tooltip: '上边绳子上的节点数（列数）' })
    cols = 12;

    /** 每列竖向节点数（含最上一行，>=2） */
    @property({ tooltip: '每列向下垂的节点数（含顶边）' })
    rows = 24;

    /** 左上角固定位置（父节点坐标系） */
    @property({ tooltip: '布料左上角锚点（相对父节点）' })
    topLeftPos: cc.Vec2 = cc.v2(-200, 200);

    /**
     * 竖向相邻质点目标间距（与原绳子 baseLen 含义一致）
     */
    @property({ tooltip: '竖向链相邻节点目标间距' })
    baseLen = 20;

    /**
     * 横向相邻质点目标间距（顶边绳段 + 下面每一行的横向约束）
     */
    @property({ tooltip: '横向相邻列同一行上的目标间距' })
    horizontalBaseLen = 22;

    @property({ tooltip: '约束迭代次数' })
    constraintIterations = 22;

    /** 网格线：绿色（与 RopeRow 的描边层对应，仅颜色按需求设） */
    @property({ tooltip: '网格线颜色（横竖边线），默认绿；alpha=0 不画线' })
    strokeColor: cc.Color = cc.color(0, 255, 0, 255);

    /** 节点圆点：红色（与 RopeRow 画质点方式一致，仅填充色为红） */
    @property({ tooltip: '节点圆点填充色，默认红' })
    nodeFillColor: cc.Color = cc.color(255, 0, 0, 255);

    @property({ tooltip: '节点圆点半径，与 RopeRow 一致为 5' })
    nodeRadius = 5;

    @property({ tooltip: '与 Rope.ts 绳线类似：每列垂下的「绳」描边线宽；0 则不画绳线只画网格' })
    ropeLineWidth = 2;

    private graphics: cc.Graphics = null;

    private readonly _dp = new cc.Vec2();

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
        if (!this.graphics) {
            this.graphics = this.node.addComponent(cc.Graphics);
        }
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    start() {
        this.buildGrid();
    }

    private buildGrid() {
        const cols = Math.max(2, Math.floor(this.cols));
        const rows = Math.max(2, Math.floor(this.rows));
        this.cols = cols;
        this.rows = rows;

        const lx = this.topLeftPos.x;
        const ly = this.topLeftPos.y;
        const hx = this.horizontalBaseLen;

        this.nodes = [];
        for (let c = 0; c < cols; c++) {
            const col: RopeNode[] = [];
            const x = lx + c * hx;
            for (let r = 0; r < rows; r++) {
                const y = ly - r * this.baseLen;
                col.push(new RopeNode(x, y));
            }
            this.nodes.push(col);
        }

        this.pinTopLeft();
    }

    /** 拖动与旧绳子「拖绳头」一致：只改右上角位置 */
    onTouchMove = (() => {
        const tempPos = new cc.Vec3();

        return (e: cc.Event.EventTouch) => {
            const uiPos = e.getLocation();
            tempPos.set(cc.v3(uiPos.x, uiPos.y, 0));
            this.node.parent.convertToNodeSpaceAR(tempPos, tempPos);
            const br = this.nodes[this.cols - 1][0];
            br.pos.x = tempPos.x;
            br.pos.y = tempPos.y;
        };
    })();

    private pinTopLeft() {
        const p = this.nodes[0][0];
        p.pos.x = this.topLeftPos.x;
        p.pos.y = this.topLeftPos.y;
        p.prePos.x = this.topLeftPos.x;
        p.prePos.y = this.topLeftPos.y;
    }

    private updatePoints(dt: number) {
        const cols = this.cols;
        const rows = this.rows;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (c === 0 && r === 0) {
                    continue;
                }
                if (c === cols - 1 && r === 0) {
                    continue;
                }
                this.nodes[c][r].onUpdate(dt);
            }
        }
    }

    /**
     * 距离约束：rest 为静长；mode 决定只动哪一端（对应原绳子头/尾固定时的处理方式）
     */
    private satisfyDistance(
        a: RopeNode,
        b: RopeNode,
        rest: number,
        mode: 'both' | 'moveB' | 'moveA'
    ) {
        const dp = cc.Vec2.subtract(this._dp, a.pos, b.pos);
        const dis = dp.len();
        if (dis <= rest || dis < 1e-8) {
            return;
        }
        const delta = dis - rest;
        const dir = dp.normalize().multiplyScalar(delta);
        if (mode === 'both') {
            dir.multiplyScalar(0.5);
            a.pos.subtract(dir);
            b.pos.addSelf(dir);
        } else if (mode === 'moveB') {
            b.pos.addSelf(dir);
        } else {
            a.pos.subtract(dir);
        }
    }

    private verticalMode(c: number, rTop: number): 'both' | 'moveB' | 'moveA' {
        // 约束边为 (c, rTop) 到 (c, rTop+1)，上端 (c,rTop) 下端 (c,rTop+1)
        if (rTop === 0 && c === 0) {
            return 'moveB';
        }
        if (rTop === 0 && c === this.cols - 1) {
            return 'moveB';
        }
        return 'both';
    }

    private horizontalMode(row: number, cLeft: number): 'both' | 'moveB' | 'moveA' {
        // 边从 (cLeft, row) 到 (cLeft+1, row)
        if (row !== 0) {
            return 'both';
        }
        if (cLeft === 0) {
            return 'moveB';
        }
        if (cLeft === this.cols - 2) {
            return 'moveA';
        }
        return 'both';
    }

    private constraint() {
        const it = this.constraintIterations;
        const cols = this.cols;
        const rows = this.rows;
        const vb = this.baseLen;
        const hb = this.horizontalBaseLen;

        for (let step = 0; step < it; step++) {
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows - 1; r++) {
                    const a = this.nodes[c][r];
                    const b = this.nodes[c][r + 1];
                    this.satisfyDistance(a, b, vb, this.verticalMode(c, r));
                }
            }

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols - 1; c++) {
                    // 仅左右两角、无中间顶边节点时：与单绳仅头尾同理，无法仅用两端满足绳长，跳过
                    if (r === 0 && cols === 2) {
                        continue;
                    }
                    const a = this.nodes[c][r];
                    const b = this.nodes[c + 1][r];
                    this.satisfyDistance(a, b, hb, this.horizontalMode(r, c));
                }
            }
        }
    }

    /**
     * 美术与 RopeRow 同一套路：先描边（线），再在结点画圆（点）。
     * 「面」由横竖网格线围成线框格，不做整块浅色填充。
     */
    private draw() {
        if (!this.graphics) {
            return;
        }
        this.graphics.clear();

        const cols = this.cols;
        const rows = this.rows;
        if (cols < 2 || rows < 2) {
            return;
        }

        // 与 Rope.ts 一致：每列一条从上到下的折线 = 一根「绳」的视觉效果
        const lineStroke = this.strokeColor.a > 0 ? this.strokeColor : cc.color(0, 255, 0, 255);
        if (lineStroke.a > 0) {
            this.graphics.strokeColor = lineStroke;
            if (this.ropeLineWidth > 0) {
                this.graphics.lineWidth = this.ropeLineWidth;
                for (let c = 0; c < cols; c++) {
                    const col = this.nodes[c];
                    this.graphics.moveTo(col[0].pos.x, col[0].pos.y);
                    for (let r = 1; r < rows; r++) {
                        this.graphics.lineTo(col[r].pos.x, col[r].pos.y);
                    }
                    this.graphics.stroke();
                }
            }

            // 网格横线（细线）；绳线宽为 0 时补画细竖线
            this.graphics.lineWidth = 10;
            for (let r = 0; r < rows; r++) {
                this.graphics.moveTo(this.nodes[0][r].pos.x, this.nodes[0][r].pos.y);
                for (let c = 1; c < cols; c++) {
                    const p = this.nodes[c][r].pos;
                    this.graphics.lineTo(p.x, p.y);
                }
                this.graphics.stroke();
            }
            if (this.ropeLineWidth <= 0) {
                for (let c = 0; c < cols; c++) {
                    this.graphics.moveTo(this.nodes[c][0].pos.x, this.nodes[c][0].pos.y);
                    for (let r = 1; r < rows; r++) {
                        const p = this.nodes[c][r].pos;
                        this.graphics.lineTo(p.x, p.y);
                    }
                    this.graphics.stroke();
                }
            }
        }

        this.graphics.fillColor = this.nodeFillColor;
        const nr = this.nodeRadius;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const p = this.nodes[c][r].pos;
                this.graphics.circle(p.x, p.y, nr);
                this.graphics.fill();
            }
        }
    }

    update(dt: number) {
        this.pinTopLeft();
        this.updatePoints(dt);
        this.pinTopLeft();
        this.constraint();
        this.pinTopLeft();
        this.draw();
    }
}
