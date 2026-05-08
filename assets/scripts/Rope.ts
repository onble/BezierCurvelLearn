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

    onUpdate(dt: number, damping: number) {
        const v = cc.Vec2.subtract(new cc.Vec2(), this.pos, this.prePos);
        this.prePos.set(this.pos);
        v.addSelf(cc.Vec2.multiplyScalar(new cc.Vec2(), GRAVITY, dt));
        const drag = cc.misc.clampf(1 - damping, 0.01, 1);
        v.multiplyScalar(drag);
        this.pos.addSelf(v);
    }

}

const { ccclass, property } = cc._decorator;

@ccclass
export class Rope extends cc.Component {

    /**
     * 所有绳子：nodes[r][i]，r 为横向索引（0..strandCount-1），i 为沿绳从头上尾（0..count-1）
     */
    nodes: RopeNode[][] = [];

    /** 兼容旧逻辑：中间那根绳的「头」质点 */
    head: RopeNode = null;

    /** 中间那根绳的尾质点 */
    tail: RopeNode = null;

    @property({ tooltip: '尾端锚点 X（整列在此基础上按绳间距平移）' })
    tailFixedPos: cc.Vec2 = cc.v2(0, -300);

    @property({ tooltip: '单根绳相邻质点目标间距' })
    baseLen = 20;

    @property({ tooltip: '单根绳上的质点数' })
    count = 30;

    @property({ tooltip: '并列绳数量（横向排列）' })
    strandCount = 8;

    @property({ tooltip: '相邻绳之间的目标间距（横向约束静长）' })
    strandSpacing = 22;

    @property({ tooltip: '空气阻尼' })
    clothDamping = 0.06;

    @property({ tooltip: '风力（父节点局部）' })
    windForce: cc.Vec2 = cc.v2(8, 0);

    @property({ tooltip: '布面填充色' })
    clothFillColor: cc.Color = cc.color(230, 228, 240, 255);

    @property({ tooltip: '绳线描边色；透明则不描边' })
    ropeStrokeColor: cc.Color = cc.color(60, 55, 70, 200);

    @property({ tooltip: '是否绘制质点' })
    drawParticles = false;

    private graphics: cc.Graphics = null;

    private readonly _dp = new cc.Vec2();
    private readonly _windStep = new cc.Vec2();

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    start() {
        this.buildMesh();
    }

    private midIndex(): number {
        return (this.strandCount - 1) * 0.5;
    }

    /** 第 r 根绳在 X 上相对中心的偏移 */
    private strandOffsetX(r: number): number {
        return (r - this.midIndex()) * this.strandSpacing;
    }

    private buildMesh() {
        this.nodes = [];
        const sc = Math.max(2, Math.floor(this.strandCount));
        this.strandCount = sc;
        const rows = Math.max(2, this.count);
        this.count = rows;

        for (let r = 0; r < sc; r++) {
            const ox = this.strandOffsetX(r);
            const col: RopeNode[] = [];
            for (let i = 0; i < rows; i++) {
                const t = rows > 1 ? i / (rows - 1) : 0;
                const y = this.tailFixedPos.y * t;
                col.push(new RopeNode(this.tailFixedPos.x + ox, y));
            }
            this.nodes.push(col);
        }

        const mid = Math.floor(this.midIndex());
        this.head = this.nodes[mid][0];
        this.tail = this.nodes[mid][rows - 1];
        this.pinAllTails();
    }

    onTouchMove = (() => {
        const tempPos = new cc.Vec3();

        return (e: cc.Event.EventTouch) => {
            const uiPos = e.getLocation();
            tempPos.set(cc.v3(uiPos.x, uiPos.y, 0));
            this.node.parent.convertToNodeSpaceAR(tempPos, tempPos);
            this.pinAllHeads(tempPos.x, tempPos.y);
        };
    })();

    /** 触摸点作为整排绳头顶边的中点，各头沿 X 铺开 */
    private pinAllHeads(cx: number, cy: number) {
        const sc = this.nodes.length;
        for (let r = 0; r < sc; r++) {
            const ox = this.strandOffsetX(r);
            const h = this.nodes[r][0];
            h.pos.x = cx + ox;
            h.pos.y = cy;
            h.prePos.x = h.pos.x;
            h.prePos.y = h.pos.y;
        }
    }

    private pinAllTails() {
        const sc = this.nodes.length;
        const rows = this.count;
        for (let r = 0; r < sc; r++) {
            const ox = this.strandOffsetX(r);
            const t = this.nodes[r][rows - 1];
            t.pos.x = this.tailFixedPos.x + ox;
            t.pos.y = this.tailFixedPos.y;
            t.prePos.x = t.pos.x;
            t.prePos.y = t.pos.y;
        }
    }

    updatePoints(dt: number) {
        const damp = cc.misc.clampf(this.clothDamping, 0, 0.95);
        const sc = this.nodes.length;
        const rows = this.count;
        const wind = this.windForce;
        const hasWind = wind.x !== 0 || wind.y !== 0;
        if (hasWind) {
            this._windStep.x = wind.x * dt;
            this._windStep.y = wind.y * dt;
        }

        for (let r = 0; r < sc; r++) {
            const col = this.nodes[r];
            for (let i = 1; i < rows - 1; i++) {
                const p = col[i];
                p.onUpdate(dt, damp);
                if (hasWind) {
                    p.pos.addSelf(this._windStep);
                }
            }
        }
    }

    /**
     * 距离约束：两点尽量接近目标长度；若一端应固定则只动另一端（由调用方决定）
     */
    private satisfyEdge(
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

    constraint() {
        const iterations = 18;
        const sc = this.nodes.length;
        const rows = this.count;
        const restH = this.strandSpacing;
        const base = this.baseLen;

        for (let step = 0; step < iterations; step++) {

            // 纵向：每根绳内部
            for (let r = 0; r < sc; r++) {
                const col = this.nodes[r];
                const tailNode = col[rows - 1];
                for (let i = 0; i < rows - 1; i++) {
                    const p = col[i];
                    const next = col[i + 1];
                    const dp = cc.Vec2.subtract(this._dp, p.pos, next.pos);
                    const dis = dp.len();
                    if (dis <= base || dis < 1e-8) {
                        continue;
                    }
                    const delta = dis - base;
                    const dir = dp.normalize().multiplyScalar(delta);
                    if (i === 0 && next === tailNode) {
                        continue;
                    }
                    if (i === 0) {
                        next.pos.addSelf(dir);
                    } else if (next === tailNode) {
                        p.pos.subtract(dir);
                    } else {
                        dir.multiplyScalar(0.5);
                        p.pos.subtract(dir);
                        next.pos.addSelf(dir);
                    }
                }
            }

            // 横向：同一「行」上相邻绳的质点相连（头行、尾行由 pin 控制，这里只约束中间行以免抢拖动）
            for (let i = 1; i <= rows - 2; i++) {
                for (let r = 0; r < sc - 1; r++) {
                    const p = this.nodes[r][i];
                    const q = this.nodes[r + 1][i];
                    this.satisfyEdge(p, q, restH, 'both');
                }
            }
        }
    }

    draw() {
        this.graphics.clear();

        const sc = this.nodes.length;
        const rows = this.count;
        if (sc < 1 || rows < 2) {
            return;
        }

        // 布面：相邻绳与相邻质点形成四边形
        this.graphics.fillColor = this.clothFillColor;
        for (let r = 0; r < sc - 1; r++) {
            for (let i = 0; i < rows - 1; i++) {
                const a = this.nodes[r][i].pos;
                const b = this.nodes[r][i + 1].pos;
                const c = this.nodes[r + 1][i + 1].pos;
                const d = this.nodes[r + 1][i].pos;
                this.graphics.moveTo(a.x, a.y);
                this.graphics.lineTo(b.x, b.y);
                this.graphics.lineTo(c.x, c.y);
                this.graphics.lineTo(d.x, d.y);
                this.graphics.close();
                this.graphics.fill();
            }
        }

        // 轮廓：每根绳中心线
        if (this.ropeStrokeColor.a > 0) {
            this.graphics.strokeColor = this.ropeStrokeColor;
            this.graphics.lineWidth = 1.5;
            for (let r = 0; r < sc; r++) {
                const col = this.nodes[r];
                this.graphics.moveTo(col[0].pos.x, col[0].pos.y);
                for (let i = 1; i < rows; i++) {
                    this.graphics.lineTo(col[i].pos.x, col[i].pos.y);
                }
                this.graphics.stroke();
            }
        }

        if (this.drawParticles) {
            for (let r = 0; r < sc; r++) {
                for (let i = 0; i < rows; i++) {
                    const p = this.nodes[r][i].pos;
                    const isHead = i === 0;
                    const isTail = i === rows - 1;
                    this.graphics.fillColor = isHead ? cc.Color.GREEN : isTail ? cc.Color.RED : cc.Color.WHITE;
                    this.graphics.circle(p.x, p.y, 3);
                    this.graphics.fill();
                }
            }
        }
    }

    update(dt: number) {
        this.pinAllTails();
        this.updatePoints(dt);
        this.pinAllTails();
        this.constraint();
        this.pinAllTails();

        const mid = Math.floor(this.midIndex());
        if (this.nodes[mid]) {
            this.head = this.nodes[mid][0];
            this.tail = this.nodes[mid][this.count - 1];
        }

        this.draw();
    }
}
