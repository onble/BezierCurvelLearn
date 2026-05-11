const { ccclass, property } = cc._decorator;
// 参考:https://forum.cocos.org/t/topic/164324

@ccclass
export class OnClick extends cc.Component {

    @property({ displayName: "停止冒泡事件" }) stopPropagation: boolean = false;
    @property({ displayName: "停止吞没事件" }) stopSwallowEvent: boolean = false;

    start() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart_UseCapture, this, true);
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);

        if (this.stopSwallowEvent) {
            this.node["_touchListener"].setSwallowTouches(false);
        }
    }

    onTouchStart_UseCapture(event: cc.Event.EventTouch) {
        console.log(`%c${this.node.name}`, `color: #${this.node.color.toHEX()};`, ` 捕获阶段`,);
        console.log(
            `target:%c ${event.target.name}, %c currentTarget: %c${event.currentTarget.name}`,
            `color: #${event.target.color.toHEX()};`,
            ``,
            `color: #${event.currentTarget.color.toHEX()};`
        );
    }

    onTouchStart(event: cc.Event.EventTouch) {
        console.log(`%c${this.node.name}`, `color: #${this.node.color.toHEX()};`, ` 冒泡阶段`);

        if (this.stopPropagation) {
            event.stopPropagation();
        }

        console.log(
            `target:%c ${event.target.name}, %c currentTarget: %c${event.currentTarget.name}`,
            `color: #${event.target.color.toHEX()};`,
            ``,
            `color: #${event.currentTarget.color.toHEX()};`
        );
    }
}