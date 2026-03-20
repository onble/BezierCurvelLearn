const { ccclass, property } = cc._decorator;

@ccclass('Draggable')
export default class Draggable extends cc.Component {
    // 是否正在拖拽
    private _isDragging = false;
    // 触摸点与节点原点的偏移（解决点击位置偏移问题）
    private _touchOffset: cc.Vec2 = cc.v2(0, 0);

    onLoad() {
        // 注册触摸事件
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy() {
        // 注销触摸事件，防止内存泄漏
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _onTouchStart(event: cc.Event.EventTouch) {
        this._isDragging = true;
        // 获取触摸点在世界坐标的位置
        const touchWorldPos = event.touch.getLocation();
        // 转换为节点父节点的本地坐标
        const nodeParent = this.node.parent;
        const touchLocalPos = nodeParent.convertToNodeSpaceAR(touchWorldPos);
        // 计算触摸点与节点原点的偏移
        this._touchOffset = touchLocalPos.sub(new cc.Vec2(this.node.position.x, this.node.position.y));
        // 可选：将节点置顶，避免被遮挡
        // this.node.setSiblingIndex(nodeParent.children.length - 1);
    }

    private _onTouchMove(event: cc.Event.EventTouch) {
        if (!this._isDragging) return;

        const touchWorldPos = event.touch.getLocation();
        const nodeParent = this.node.parent;
        const touchLocalPos = nodeParent.convertToNodeSpaceAR(touchWorldPos);
        // 用触摸位置减去偏移量，更新节点位置
        const newPos = touchLocalPos.sub(this._touchOffset)
        this.node.setPosition(newPos.x, newPos.y);
        cc.systemEvent.emit('drawline');
    }

    private _onTouchEnd(event: cc.Event.EventTouch) {
        this._isDragging = false;
        cc.systemEvent.emit('drawline');
    }
}