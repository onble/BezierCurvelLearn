const { ccclass, property } = cc._decorator;
@ccclass
export default class RopeSegment extends cc.Component {
    @property(cc.RigidBody) public rigidBody: cc.RigidBody = null;
    @property(cc.RopeJoint) public joint: cc.RopeJoint = null;
}