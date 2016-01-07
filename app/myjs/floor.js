/**
 * Created by Reginald on 4/30/2015.
 */


function CreateFloor(scene, dynamicsWorld){
    this.physicsInfo.shape = new Ammo.btBoxShape(new Ammo.btVector3(
        this.size.x/2, this.size.y/2, this.size.z/2));
		
    this.physicsInfo.transform = new Ammo.btTransform();
    this.physicsInfo.transform.setIdentity();
    this.physicsInfo.transform.setOrigin(new Ammo.btVector3(this.startingPos.x,
       this.startingPos.y, this.startingPos.z));
	   
    var localInertia=new Ammo.btVector3(0,0,0);
    var motionState = new Ammo.btDefaultMotionState( this.physicsInfo.transform );
	
    var constructionInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, this.physicsInfo.shape, localInertia);
    this.physicsInfo.body=new Ammo.btRigidBody(constructionInfo);
	
	// turns off all rotation
    this.physicsInfo.body.setAngularFactor(0,0,0);
    // keeps physics from going to sleep (from bullet documentation)
    var DISABLE_DEACTIVATION = 4;
    this.physicsInfo.body.setActivationState(DISABLE_DEACTIVATION);
    dynamicsWorld.addRigidBody(this.physicsInfo.body);
	
	this.geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    this.material = new THREE.MeshPhongMaterial({color: 0X00FFFF});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
	this.mesh.matrixAutoUpdate = false;
    scene.add(this.mesh);
}

var FloorProto = {
	name:"floor",
    size: {x:20, y:1, z:20},
	startingPos: {x:0, y:0, z:0},
    segments: 10,
    geometry: undefined,
    material: undefined,
    physicsInfo:{}


};

CreateFloor.prototype = FloorProto;



