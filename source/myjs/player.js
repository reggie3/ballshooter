/**
 * Created by Reginald on 4/30/2015.
 */



var maxSpeed = 10;
var controls = undefined;
var name = "player";

var startingPos = { x: 0, y: 4, z: 0 };
var segments = 1;
var geometry = undefined;
var material = undefined;

var physicsInfo = {};


var speed = 1;
var linearVelocity = null;

function Player(scene, dynamicsWorld, controls, camera) {

    this.scene = scene;
    this.physicsWorld = dynamicsWorld;

    physicsInfo.shape = new Ammo.btCylinderShape(new Ammo.btVector3(this.size.topRad / 2,
        this.size.height / 2, this.topRad / 2));


    physicsInfo.transform = new Ammo.btTransform();
    physicsInfo.transform.setIdentity();
    physicsInfo.transform.setOrigin(new Ammo.btVector3(startingPos.x,
        startingPos.y, startingPos.z));

    var localInertia = new Ammo.btVector3(0, 0, 0);
    var motionState = new Ammo.btDefaultMotionState(physicsInfo.transform);
    physicsInfo.shape.calculateLocalInertia(this.mass, localInertia);

    var constructionInfo = new Ammo.btRigidBodyConstructionInfo(this.mass, motionState, physicsInfo.shape, localInertia);
    physicsInfo.body = new Ammo.btRigidBody(constructionInfo);
    physicsInfo.body.setWorldTransform(physicsInfo.transform);
    //physicsInfo.body.setFriction(10);

    //constrain the movement to the xz plane
    //physicsInfo.body.setLinearFactor(new Ammo.btVector3(1,1,1));
    physicsInfo.body.setAngularFactor(new Ammo.btVector3(0, 0, 0));
    
    // keeps physics from going to sleep (from bullet documentation)
    var DISABLE_DEACTIVATION = 4;
    physicsInfo.body.setActivationState(DISABLE_DEACTIVATION);
    dynamicsWorld.addRigidBody(physicsInfo.body);

    geometry = new THREE.CylinderGeometry(this.size.topRad, this.size.bottomRad,
        this.size.height, 20, 20, false);
    //geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    material = new THREE.MeshBasicMaterial({ color: 0XFFFF00 });
    this.playerMesh = new THREE.Mesh(geometry, material);
    //don't use three.js's update functions since we're using physics
    this.playerMesh.updateMatrix();
    this.playerMesh.matrixAutoUpdate = false;
    scene.add(this.playerMesh);

    //make the camera a child of the player
    //this.mesh.add(camera);
    //camera.position.set(0,1,5);
    this.camera = camera;



    this.playerMesh.add(controls.getObject());
    controls.getObject().position.set(0, this.size.height / 2, 0);
    //controls.getObject().position.set(0, 3, -5);

    this.linearVelocity = new Ammo.btVector3(0, -1, 0);
}

var PlayerProto = {
    ahead: false,
    right: false,
    left: false,
    back: false,
    camera: undefined,
    turnLeft: false,
    turnRight: false,
    mainOn: false,
    debug: false,
    maxSpeed: 20,
    mass: 2,
    playerMesh: undefined,
    scene:undefined,
    physicsWorld:undefined,
    size: { topRad: .5, bottomRad: .5, height: 2 },
    force: {
        ahead: new Ammo.btVector3(0, 0, -1),
        back: new Ammo.btVector3(0, 0, 1),
        left: new Ammo.btVector3(-1, 0, 0),
        right: new Ammo.btVector3(1, 0, 0),
    },
    linearVelocity: undefined,
    bullets: [],


    update: function (physicsWorld, dt, controls) {
        // move objects
        if (this.playerMesh) {
            
            // get camera direction
            var dir3 = new THREE.Vector3();
            controls.getDirection(dir3);
            // convert to Ammo vector, project to plane
            var dir = new Ammo.btVector3(dir3.x, 0, dir3.z);
            var yUnit = new Ammo.btVector3(0, 1, 0);
            dir.normalize();
            // right direction is dir X yUnit
            var right = dir.cross(yUnit);

            var trans = physicsInfo.body.getWorldTransform(trans);
            var body = physicsInfo.body;
            
            //update the mesh's matrix
            AmmoPhysicsHelper.b2three(trans, this.playerMesh.matrixWorld);  
            
            this.linearVelocity = new Ammo.btVector3(0, -1, 0);
            if(this.debug)
                console.log("body velocity 1: " + this.linearVelocity.x() + ", " +
                    this.linearVelocity.y() + ", " + this.linearVelocity.z());
            if (this.ahead) {
                this.linearVelocity.op_add(dir);
            }
            if (this.right) {
                this.linearVelocity.op_add(right);
            }
            if (this.left) {
                this.linearVelocity.op_sub(right);
            }

            if (this.back) {
                this.linearVelocity.op_sub(dir);
            }
            if (this.debug)
                console.log("body velocity after dir: " + this.linearVelocity.x() + ", " + this.linearVelocity.y() +
                    ", " + this.linearVelocity.z());
            this.linearVelocity.normalize();
            if (this.debug)
                console.log("body velocity after normalize: " + this.linearVelocity.x() + ", " + this.linearVelocity.y() +
                    ", " + this.linearVelocity.z());
            this.linearVelocity.op_mul(this.maxSpeed);
            if (this.debug)
                console.log("body velocity after speed: " + this.linearVelocity.x() + ", " + this.linearVelocity.y() +
                    ", " + this.linearVelocity.z());
            body.setLinearVelocity(this.linearVelocity); 
            //AmmoPhysicsHelper.updateMesh(this.playerMesh, trans);
            this.printDebugInfo(trans);
            
            
            //if the user has pressed the spacebar fire something
            if(this.mainOn){
                //turn off this.mainOn to avoid multiple shots for one spacebar push
                this.mainOn = false;
                
                console.log("shooting");
                var mesh = this.playerMesh;
                
                // get camera direction since that is where the bullet is going
                var cameraVector = new THREE.Vector3();
                controls.getDirection(cameraVector);
                //the bullet will appear down the camera axis with a displacment of one
                var ammoOrigin = trans.getOrigin();
                var origin = new THREE.Vector3(ammoOrigin.x(), ammoOrigin.y(), ammoOrigin.z());
                //origin.normalize();
                //origin.y -=8;
                
                // get the bullet's linear velocity
                var bulletLV = new Ammo.btVector3(cameraVector.x, cameraVector.y, cameraVector.z);
                bulletLV.normalize();
                
                bulletLV.op_mul(100);
                var bulletMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(.5, 32, 32),
                    new THREE.MeshPhongMaterial( {
                        color: 0x111111,
                        shininess: 50
                        } )
                );
                
                //set the initial postion of the bullet
                bulletMesh.position.copy(origin);
                
                //update the matrix with the new position and then turn off auto updating
                bulletMesh.updateMatrix;
                bulletMesh.matrixAutoUpdate = false;
                
                
                var bulletBody = AmmoPhysicsHelper.CreateBouncyBall(bulletMesh, physicsWorld, 2, .5);
                bulletBody.affectedByPhysics = true;
                bulletBody.setLinearVelocity(bulletLV);
                 
                colliders.push(bulletMesh);
                
                this.scene.add(bulletMesh);  
                this.bullets.push({
                    mesh: bulletMesh, 
                    body : bulletBody,
                    isFirstFrame : true,
                    lastVel : new Ammo.btVector3()});

                //play firing sound
                SoundEngineProto.playSoundFromBuffer("pew");
            }

            
        }
        //update the bullets
        for(var j=0; j<this.bullets.length; j++){ 
            var trans = this.bullets[j].body.getWorldTransform(trans);
            var mat = this.bullets[j].mesh.matrixWorld;
            AmmoPhysicsHelper.b2three(trans, mat);
            
            //check for collsion by checking for rapid changes  in bullet velocity
            //play a sound if there is a collsion
            var vel = this.bullets[j].body.getLinearVelocity();     
            if (!this.bullets[j].isFirstFrame) {
                var dvx = vel.getX() - this.bullets[j].lastVel.getX();
                var dvy = vel.getY() - this.bullets[j].lastVel.getY();
                var dvz = vel.getZ() - this.bullets[j].lastVel.getZ();
                var acc2 = dvx*dvx + dvy*dvy + dvz*dvz;
                if (acc2 > 200)
                    SoundEngineProto.playSoundFromBuffer("bounce");
            }
                this.bullets[j].isFirstFrame = false;
                this.bullets[j].lastVel.setX( vel.getX() );
                this.bullets[j].lastVel.setY( vel.getY() );
                this.bullets[j].lastVel.setZ( vel.getZ() );

            
            
            if(false){
                //print bullet debug info
                var origin = trans.getOrigin();
                console.log("bullet loc: " + origin.x() + ", " + origin.y() + ", " + origin.z());
                console.log("bullet velocity: " + this.bulletBodies[j].getLinearVelocity().getX() + ", " + 
                    this.bulletBodies[j].getLinearVelocity().getY() + ", " +
                    this.bulletBodies[j].getLinearVelocity().getZ());
            }
        }
    },

    printDebugInfo: function (trans, direction) {
        if (this.debug) {
            var origin = trans.getOrigin();
            console.log("player loc: " + origin.x() + ", " + origin.y() + ", " + origin.z());
            console.log("body velocity: " + this.linearVelocity.x() + ", " + this.linearVelocity.y() +
                ", " + this.linearVelocity.z());
        }
    }

};

Player.prototype = PlayerProto;