/**
 * 重力
 */
const GRAVITY = new cc.Vec2(0, -98);

class RopeNode {

    /**
     * 当前帧位置
     */
    pos: cc.Vec2 = null;

    /**
     * 上一帧的位置
     */
    prePos: cc.Vec2 = null;

    constructor(x: number, y: number) {
        this.pos = cc.v2(x, y);
        this.prePos = cc.v2(x, y);
    }

    onUpdate(dt: number) {

        // 计算速度（这个步长已经是两帧之间的步长了）
        const v = cc.Vec2.subtract(new cc.Vec2(), this.pos, this.prePos);

        // 保存上一帧的位置
        this.prePos.set(this.pos);

        // 叠加重力加速度
        v.addSelf(cc.Vec2.multiplyScalar(new cc.Vec2(), GRAVITY, dt));

        // 计算下一帧位置
        this.pos.addSelf(v);
    }

}
const { ccclass, property } = cc._decorator;

@ccclass
export class Rope extends cc.Component {

    /**
 * 节点数组
 */
    nodeArr: RopeNode[] = [];

    /**
     * 头节点
     */
    head: RopeNode = null;

    /**
     * 尾节点（固定端）
     */
    tail: RopeNode = null;

    /**
     * 尾节点在父节点坐标系下的固定位置
     */
    @property({ tooltip: '尾节点固定位置（相对父节点）' })
    tailFixedPos: cc.Vec2 = cc.v2(0, -300);

    /**
     * 基础长度
     */
    baseLen = 20;

    /**
     * 节点数量
     */
    count = 30;

    private graphics: cc.Graphics = null;

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    start() {
        // 初始化节点
        for (let i = 0; i < this.count; i++) {
            this.nodeArr.push(new RopeNode(0, 0));
        }
        this.head = this.nodeArr[0];
        this.tail = this.nodeArr[this.count - 1];
        this.pinTail();
    }

    /**
     * 鼠标事件，用于把头节点移到指定位置
     */
    onTouchMove = (() => {
        const tempPos = new cc.Vec3();

        return (e: cc.Event.EventTouch) => {
            const uiPos = e.getLocation();
            tempPos.set(cc.v3(uiPos.x, uiPos.y, 0));
            this.node.parent.convertToNodeSpaceAR(tempPos, tempPos);
            //  把头部移动到指定位置
            this.head.pos.set(cc.v2(tempPos.x, tempPos.y));
        }
    })()

    /**
     * 更新节点
     * @param dt
     */
    updatePoints(dt: number) {
        const { nodeArr } = this;
        // 头由触摸控制，尾为固定点：中间节点做 Verlet 积分
        for (let i = 1; i < nodeArr.length - 1; i++) {
            nodeArr[i].onUpdate(dt);
        }
    }

    /** 将尾节点钉在 tailFixedPos，并同步上一帧位置（避免 Verlet 漂移） */
    private pinTail() {
        this.tail.pos.set(this.tailFixedPos);
        this.tail.prePos.set(this.tailFixedPos);
    }

    /**
     * 简单的约束
     */
    constraint() {
        const { nodeArr } = this;

        // 多次迭代保证稳定性
        const time = 20;
        for (let step = 0; step < time; step++) {

            const len = this.nodeArr.length - 1;
            for (let i = 0; i < len; i++) {

                const p = nodeArr[i];
                const next = nodeArr[i + 1];

                // 相邻节点间距
                const dp = cc.Vec2.subtract(new cc.Vec2(), p.pos, next.pos);
                const dis = dp.len();

                // 超出基础长度时调整位置
                if (dis > this.baseLen) {
                    const delta = dis - this.baseLen;
                    const dir = dp.normalize().multiplyScalar(delta);
                    // 仅头尾两节时无法在不拖动头/尾的情况下满足绳长，跳过该边约束
                    if (i === 0 && next === this.tail) {
                        continue;
                    }
                    if (i === 0) {
                        next.pos.addSelf(dir);
                    } else if (next === this.tail) {
                        // 尾固定：只把前一节点拉向尾端
                        p.pos.subtract(dir);
                    } else {
                        dir.multiplyScalar(0.5);
                        p.pos.subtract(dir);
                        next.pos.addSelf(dir);
                    }
                }
            }
        }
    }

    /**
     * 绘制
     */
    draw() {
        this.graphics.clear();

        //  画出绳子
        this.graphics.moveTo(this.head.pos.x, this.head.pos.y);
        for (let i = 1; i < this.nodeArr.length; i++) {
            const node = this.nodeArr[i];
            this.graphics.lineTo(node.pos.x, node.pos.y);
        }
        this.graphics.stroke();

        // 画出节点
        for (let i = 0; i < this.nodeArr.length; i++) {
            const node = this.nodeArr[i];
            this.graphics.moveTo(node.pos.x, node.pos.y);
            this.graphics.circle(node.pos.x, node.pos.y, 5);
            this.graphics.fill();
        }
    }

    /**
     * 更新
     * @param dt
     */
    update(dt: number) {
        this.pinTail();
        this.updatePoints(dt);
        this.pinTail();
        this.constraint();
        this.pinTail();
        this.draw();
    }
}
