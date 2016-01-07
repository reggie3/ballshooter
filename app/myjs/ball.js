/**
 * Created by Reginald on 4/30/2015.
 */

function Ball(scene, dynamicsWorld){

    this.geometry = new THREE.SphereGeometry(this.radius, 10, 10);
    this.material = new THREE.MeshPhongMaterial({color: 0X00FF});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.matrixAutoUpdate = false;
    scene.add(this.mesh);

    this.mesh.geometry.computeBoundingSphere();


    this.physicsInfo.shape = new Ammo.btSphereShape(this.radius);

    this.physicsInfo.transform = new Ammo.btTransform();
    this.physicsInfo.transform.setIdentity();
    this.physicsInfo.transform.setOrigin(new Ammo.btVector3(this.startingPos.x,
        this.startingPos.y, this.startingPos.z));

    var localInertia=new Ammo.btVector3(0,0,0);
    var motionState = new Ammo.btDefaultMotionState( this.physicsInfo.transform );
    var mass=2;
    this.physicsInfo.shape.calculateLocalInertia(mass, localInertia);

    var constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, this.physicsInfo.shape, localInertia);
    this.physicsInfo.body=new Ammo.btRigidBody(constructionInfo);
    this.physicsInfo.body.setWorldTransform(this.physicsInfo.transform);

    // turns off all rotation
    this.physicsInfo.body.setAngularFactor(0,0,0);
    // keeps physics from going to sleep (from bullet documentation)
    var DISABLE_DEACTIVATION = 4;
    this.physicsInfo.body.setActivationState(DISABLE_DEACTIVATION);
    dynamicsWorld.addRigidBody(this.physicsInfo.body);

    this.ballID = this.ballArray.length;
    this.ballArray.push(this);
}

var BallProto = {
    boundingSphere: null,
    ballArray: [],
    ballID: 0,
    name: "ball",
    radius: .5,
    startingPos: {x:-5, y:5, z:0},
    segments: 1,
    geometry: undefined,
    material: undefined,
    mesh: undefined,
    physicsInfo:{},
    update : function(dt){
        // move objects
        var trans=this.physicsInfo.body.getWorldTransform(trans);
        var mat = this.mesh.matrixWorld;
        AmmoPhysicsHelper.b2three(trans,mat);
    }

};

Ball.prototype = BallProto;