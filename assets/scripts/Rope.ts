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
        console.warn("this.pos", this.pos.y, dt);

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

    private graphics: cc.Graphics = null;

    point: RopeNode = null;

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
    }

    start() {
        this.point = new RopeNode(0, 300);
    }

    /**
     * 绘制
     */
    draw() {
        this.graphics.clear();
        // 画出点
        this.graphics.moveTo(this.point.pos.x, this.point.pos.y);
        this.graphics.circle(this.point.pos.x, this.point.pos.y, 30);
        this.graphics.fill();
    }

    /**
     * 更新
     * @param dt
     */
    update(dt: number) {
        this.point.onUpdate(dt);
        this.draw();
    }
}
