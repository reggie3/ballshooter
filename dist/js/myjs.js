/**
 * Created by Reginald on 4/30/2015.
 */

var SoundEngineProto = {

    soundObjects: {}, //object holding all the sounds for the progrogram
    pannerObjects: {}, //container for all the sound sources that we may want to move around
    audioContext: undefined,
    state: undefined,
    init: function(){
        if (typeof AudioContext !== "undefined") {
            this.audioContext = new AudioContext();
        } else if (typeof webkitAudioContext !== "undefined") {
            this.audioContext = new webkitAudioContext();
        } else {
            throw new Error('AudioContext not supported. :(');
        }
        this.state="initialized";

    },


    /*********************************
     * loadSoundFromBase64Buffer
     * @param base64Buffer
     * @param name
     */
    loadSoundFromBase64Buffer : function(base64Buffer, name){
        var bufferArray = Base64Binary.decodeArrayBuffer(base64Buffer);

        var that = this;
        this.audioContext.decodeAudioData(bufferArray, function(buffer){
            that.soundObjects[name] = buffer;
        });


    },

    /**********************************
     * playSoundFromBuffer
     * @param name - name of the sound to be played
     */
    playSoundFromBuffer : function(name){
        var source = this.audioContext.createBufferSource(); // creates a sound source

        source.buffer = this.soundObjects[name];
        if(this.pannerObjects[name]){
            var pannerNodes = this.pannerObjects[name];
            //loop through each key in the pannerNodes
            var bolFirst=true;
            var prevPannerNode;
            for(var key in pannerNodes){
                if(pannerNodes.hasOwnProperty(key)){
                    if(bolFirst){
                        pannerNodes[key].connect(this.audioContext.destination);
                        bolFirst=false;
                    }
                    else{
                        pannerNodes[key].connect(prevPannerNode);
                    }
                    prevPannerNode = pannerNodes[key];  //move a pointer to the just created node
                }
            }
            source.connect(prevPannerNode);
        }
        else {
            source.connect(this.audioContext.destination); // connect the source to the context's destination (the speakers)
        }
        source.start(0);
    },

    /**************************************
     * Create a sound source (panner) that will follow the parent when updated
     * @param paramObject - an object with the following parameters
     * name
     * parent - optional: a mesh that will act as the parent for this sound
     * position   - option: Three.Vector3 of position of the speaker
     * innerAngle
     * outerAngle
     * coneOuterGain
     * gain
     */
    createPanner : function(paramObject){ //name, parent, postionV3, innerAngle, outerAngle,  coneOuterGain, gain){
        var gainNode;
        var panner = this.audioContext.createPanner();
        if(paramObject.innerAngle)
            panner.coneInnerAngle = 5; // inside this, volume is full
        if(paramObject.outerAngle)
            panner.coneOuterAngle = 90; // outside this, volume is coneOuterGain
        if (paramObject.coneOuterGain)
            panner.coneOuterGain = 0.1;
        if (paramObject.gain){
            gainNode = this.audioContext.createGain();
            gainNode.gain.value = paramObject.gain;
        }


        // Set the panner node to be at the origin looking in the +z direction.
        if(paramObject.parent) {
            panner.setPosition(paramObject.parent.position.x,
                paramObject.parent.position.y, paramObject.parent.position.z);
        }
        else if(paramObject.postionV3){
            panner.setPosition(paramObject.postionV3.x,
                paramObject.postionV3.y, paramObject.postionV3.z);
        }
        else{   //set speaker in center of world
            panner.setPosition(0,0,0)
        }
        panner.setOrientation(0,0,1); // unit vector
        this.pannerObjects[paramObject.name]={};

        if(gainNode){
            this.pannerObjects[paramObject.name].gainNode = gainNode;
        }
        this.pannerObjects[paramObject.name].panner = panner;
    }
};
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
/**
 * Created by Reginald on 4/30/2015.
 */

var AmmoPhysicsHelper = {
    initPhysics: function (physicsWorld) {
        var collision_config = new Ammo.btDefaultCollisionConfiguration();
        var dispatcher = new Ammo.btCollisionDispatcher(collision_config);
        var overlappingPairCache = new Ammo.btDbvtBroadphase();
        var solver = new Ammo.btSequentialImpulseConstraintSolver();
        physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collision_config);
        physicsWorld.setGravity(new Ammo.btVector3(0, -12, 0));

        return physicsWorld;
    },

    b2three: function (trans, mat) {
        var basis = trans.getBasis();
        var origin = trans.getOrigin();
        var m = mat.elements;

        var v = basis.getRow(0);
        m[0] = v.x();
        m[4 + 0] = v.y();
        m[8 + 0] = v.z();
        m[12 + 0] = origin.x();

        v = basis.getRow(1);
        m[1] = v.x();
        m[4 + 1] = v.y();
        m[8 + 1] = v.z();
        m[12 + 1] = origin.y();

        v = basis.getRow(2);
        m[2] = v.x();
        m[4 + 2] = v.y();
        m[8 + 2] = v.z();
        m[12 + 2] = origin.z();

        m[3] = 0.0;
        m[4 + 3] = 0.0;
        m[8 + 3] = 0.0;
        m[12 + 3] = 1.0;
    },

    /**********************
     * updateMesh
     * update the given mesh with the given transform
     */
     updateMesh: function (mesh, tranform) {
        var origin = tranform.getOrigin();
        mesh.position.x = origin.x();
        mesh.position.y = origin.y();
        mesh.position.z = origin.z();

        // Update rotation
        var rotation = tranform.getRotation();
        mesh.quaternion.x = rotation.x();
        mesh.quaternion.y = rotation.y();
        mesh.quaternion.z = rotation.z();
        mesh.quaternion.w = rotation.w();


        mesh.updateMatrix();
    },
    

    getTrans : function () {
        return new Ammo.btTransform();
    },

    body2world: function (body, v3B) {
        var trans = body.getWorldTransform();
        var result = trans.op_mul(v3B);
        return result;
    },

    createCollisionShape: function (mesh, mass, shape, color, dynamicsWorld) {
        mesh.updateMatrix();
        mesh.updateMatrixWorld();
        if (!mesh.geometry.boundingBox)
            mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingSphere)
            mesh.geometry.computeBoundingSphere();

        var bb = mesh.geometry.boundingBox;
        var xdim = bb.max.x - bb.min.x;
        var ydim = bb.max.y - bb.min.y;
        var zdim = bb.max.z - bb.min.z;
        var bs = mesh.geometry.boundingSphere;

        var collmesh;
        if (shape == "sphere") {
            // physics collision shape
            var shape = new Ammo.btSphereShape(bs.radius);
            // three.js collision shape
            collmesh = new THREE.Mesh(
                new THREE.SphereGeometry(bs.radius),
                new THREE.MeshLambertMaterial({ color: color, ambient: color })
                );
            collmesh.position.copy(bs.center);
        }
        /*
         // cylinder not usable currently
         // Needs code to compute dimensions
         // and appropriate orientation (tipped on side currently)
         else if (shape=="cylinder") {
         // physics collision shape
         var shape=new Ammo.btCylinderShape(new Ammo.btVector3(bs.radius,bs.radius,bs.radius));
         // three.js collision shape
         collmesh = new THREE.Mesh(
         new THREE.CylinderGeometry( bs.radius, bs.radius, 2*bs.radius ),
         new THREE.MeshLambertMaterial( { color: color, ambient: color } )
         );
         collmesh.position.copy(bs.center);
         }
         */
        else if (shape == "plane") {
            // physics collision shape
            var normalDir = new Ammo.btVector3(1, 0, 0);
            var planeConstant = bs.center.x;
            var minDim = xdim;
            if (ydim < minDim) {
                normalDir.setValue(0, 1, 0);
                planeConstant = bs.center.y;
                minDim = ydim;
            }
            if (zdim < minDim) {
                normalDir.setValue(0, 0, 1);
                planeConstant = bs.center.z;
                minDim = zdim;
            }
            var maxWidth = Math.max(xdim, ydim, zdim);
            var shape = new Ammo.btStaticPlaneShape(normalDir, planeConstant);
            // three.js collision shape
            collmesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2 * maxWidth, 2 * maxWidth),
                new THREE.MeshLambertMaterial({ color: color, ambient: color })
                );
            if (normalDir.x()) collmesh.rotation.y = Math.PI / 2;
            if (normalDir.y()) collmesh.rotation.x = Math.PI / 2;
            collmesh.position.copy(bs.center);
        }
        else { // box
            // physics collision shape
            var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));
            // three.js collision shape
            collmesh = new THREE.Mesh(
                new THREE.CubeGeometry(xdim, ydim, zdim),
                new THREE.MeshLambertMaterial({ color: color, ambient: color })
                );
            collmesh.position.set(bb.min.x + xdim / 2, bb.min.y + ydim / 2, bb.min.z + zdim / 2);
        }

        // init physics transform from three transform
        var transform = new Ammo.btTransform();
        var mat = mesh.matrixWorld;
        three2b(mat, transform);

        var localInertia = new Ammo.btVector3(0, 0, 0);
        if (mass > 0.0)
            shape.calculateLocalInertia(mass, localInertia);
        var motionState = new Ammo.btDefaultMotionState(transform);
        var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(cInfo);
        dynamicsWorld.addRigidBody(body);
        // three.js collision shape
        return { mesh: collmesh, body: body };
    },

    /****************
     *
     * @param mesh - a three.js mesh
     * @constructor
     * @param physicsWorld
     */
    CreateBouncyBall: function (mesh, physicsWorld, restitution) {
        //console.log(mesh);
        mesh.geometry.computeBoundingSphere();

        var shape = new Ammo.btSphereShape(mesh.geometry.boundingSphere.radius);
        //var shape = new Ammo.btSphereShape(mesh.geometry.boundingSphere.radius * mesh.scale);

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);
        var mass = .5;
        shape.calculateLocalInertia(mass, localInertia);

        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);

        // turns off all rotation
        body.setAngularFactor(0, 0, 0);

        body.setWorldTransform(transform);
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        // keeps physics from going to sleep (from bullet documentation)
        var DISABLE_DEACTIVATION = 4;
        body.setActivationState(DISABLE_DEACTIVATION);

        physicsWorld.addRigidBody(body);
        body.name = mesh.name;
        return body;
    },

    /****************
     *
     * @param mesh
     * @constructor
     */
    CreateStaticBox: function (mesh, physicsWorld, restitution) {

        var box = new THREE.Box3();
        box.setFromObject(mesh);


        var xdim = box.max.x - box.min.x;
        var ydim = box.max.y - box.min.y;
        var zdim = box.max.z - box.min.z;

        var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);

        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);
        //body.setWorldTransform(transform);
        physicsWorld.addRigidBody(body);
        // turns off all rotation
        body.setAngularFactor(0, 0, 0);
        body.name = mesh.name;
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        return body;
    },
    
    /*********************
     * CreateBox
     */
     CreateBox: function (mesh, physicsWorld, mass, restitution) {

        var box = new THREE.Box3();
        box.setFromObject(mesh);


        var xdim = box.max.x - box.min.x;
        var ydim = box.max.y - box.min.y;
        var zdim = box.max.z - box.min.z;

        var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);
        
        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);
        body.setWorldTransform(transform);
        physicsWorld.addRigidBody(body);
        // turns off all rotation
        body.setAngularFactor(0, 0, 0);
        body.name = mesh.name;
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        return body;
    }





}
/**
 * Created by Reginald on 5/1/2015.
 */


var useObjectLoader = true;

function SoccerField(scene, physicsWorld, loadManager, colliders) {
    if(useObjectLoader){
        var objectLoader = new THREE.ObjectLoader(loadManager);
    }
    else{
        var jsonLoader = new THREE.JSONLoader(loadManager);
        jsonLoader.texturePath = "./images";
    }
    var that = this;
      this.onGeometry = function (loaded) {
        that.meshObject = new THREE.Object3D();

        
        if(useObjectLoader){
            for (var i = loaded.children.length - 1; i >= 0; i--) {
                var mesh = loaded.children[i];
                switch (mesh.name) {
                    case "ball":
                        that.setUpBalls(mesh, that, physicsWorld, colliders);
                        
                        break;
                    case "field":
                        that.setUpField(mesh, that, physicsWorld);
                        colliders.push(mesh);
                        break;
                    case "sky":
                        that.setUpSky(mesh, that);
                        break
                    default:
                        //see if this is a wall
                        if (mesh.name.toLowerCase().indexOf("wall") != -1) {
                            that.setUpWall(mesh, that, physicsWorld);
                            colliders.push(mesh);
                        }
                        break;
                }
                that.meshObject.add(mesh);
            }
        }
        else{
            that.meshObject.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
        }

        for (var i = 0; i < that.meshObject.children.length; i++) {
            that.meshObject.children[i].updateMatrix();
            that.meshObject.children[i].matrixAutoUpdate = false;
        }
        that.meshObject.updateMatrix();
        that.meshObject.matrixAutoUpdate = false;   //it also has to be set for the parent object
        scene.add(that.meshObject);
    };
    if(useObjectLoader)
        objectLoader.load("./models/ballArena.json", this.onGeometry);
    else
        jsonLoader.load("./models/ballArenaJSONTest.json", this.onGeometry);
    
}

var SoccerFieldProto = {
    balls : [],
    meshObject: undefined,   //an object to act as the parent for the meshes we'll get in the scene
    physicsBodies: {},    //name: rigidBody container for the objects to be created
    //colliders: undefined,   //list of meshes that we can use raycaster with
    //update soccer field elements
    update: function (physicsWorld) {
        for (var key in this.physicsBodies) {
            if (this.physicsBodies.hasOwnProperty(key)) {
                if (this.physicsBodies[key].affectedByPhysics) {
                    var trans = this.physicsBodies[key].getWorldTransform(trans);
                    var mat = this.meshObject.getObjectByName(key).matrixWorld;
                    AmmoPhysicsHelper.b2three(trans, mat);
                }
            }
        }
        //update the balls
        for(var j=0; j<this.balls.length; j++){ 
            var trans = this.balls[j].body.getWorldTransform(trans);
            var mat = this.balls[j].mesh.matrixWorld;
            AmmoPhysicsHelper.b2three(trans, mat);
            
            //check for collsion by checking for rapid changes  in bullet velocity
            //play a sound if there is a collsion
            var vel = this.balls[j].body.getLinearVelocity();     
            if (!this.balls[j].isFirstFrame) {
                var dvx = vel.getX() - this.balls[j].lastVel.getX();
                var dvy = vel.getY() - this.balls[j].lastVel.getY();
                var dvz = vel.getZ() - this.balls[j].lastVel.getZ();
                var acc2 = dvx*dvx + dvy*dvy + dvz*dvz;
                if (acc2 > 200)
                    SoundEngineProto.playSoundFromBuffer("bounce");
            }
            this.balls[j].isFirstFrame = false;
            this.balls[j].lastVel.setX( vel.getX() );
            this.balls[j].lastVel.setY( vel.getY() );
            this.balls[j].lastVel.setZ( vel.getZ() );

        }
    },
    
    //set up the field
    setUpField: function (mesh, that, physicsWorld) {
        // material
        var texture = THREE.ImageUtils.loadTexture("./images/grass.png", null, function () {
                var material = new THREE.MeshLambertMaterial({
                    map: texture,
                    bumpMap: texture,
                    bumpScale: 0.01,
                    specularMap : texture
                });
                mesh.material = material;
                that.physicsBodies[mesh.name] = AmmoPhysicsHelper.CreateStaticBox(mesh, physicsWorld, .5);
                that.physicsBodies[mesh.name].affectedByPhysics = false;
                that.physicsBodies[mesh.name].setFriction(1);
            },
            function (e) {
                console.log("error loading ./images/grass.png");
            }
        );
        var bbox = new THREE.BoundingBoxHelper(mesh, 0xFFFFFF);
        bbox.update();
    },
    
    //set up the ball
    setUpBalls: function (mesh, that, physicsWorld, colliders) {
        //create clone balls
        var numBalls = 20;
        var ballDislocation = {x:10, y:3, z:20};
        for(var i=0; i<=numBalls; i++){
            var newBallMesh = mesh.clone();
            
            newBallMesh.position.set(
                mesh.position.x + Math.random() * ballDislocation.x,
                mesh.position.y + Math.random() * ballDislocation.y,
                mesh.position.z + Math.random() * ballDislocation.z
            );
            newBallMesh.name = "ball" + i;
            
            //newBallMesh.geometry.computeTangents();
            newBallMesh.material = new THREE.MeshPhongMaterial({
                color: this.getRandomColor()
                //,bumpMap: THREE.ImageUtils.loadTexture("./images/ballNoise.png")
            });
            
            this.meshObject.add(newBallMesh);
            var restitution = Math.random()*3;
            var ballBody = AmmoPhysicsHelper.CreateBouncyBall(newBallMesh, physicsWorld, restitution);
             colliders.push(newBallMesh);
             ballBody.affectedByPhysics = true;
             this.balls.push({
                body: ballBody, 
                mesh: newBallMesh,
                isFirstFrame : true,
                lastVel : new Ammo.btVector3()});
        }
        
        //add the original ball
        mesh.material = new THREE.MeshPhongMaterial({
            color: this.getRandomColor()
        });
        var restitution = Math.random()*3;
        var body = AmmoPhysicsHelper.CreateBouncyBall(mesh,
            physicsWorld, restitution);
        body.affectedByPhysics = true;
         colliders.push(mesh);  
         this.balls.push({
                body: body, 
                mesh: mesh,
                isFirstFrame : true,
                lastVel : new Ammo.btVector3()});
    },

    //set up the sky texture
    setUpSky: function (mesh, that) {
        var texture = THREE.ImageUtils.loadTexture("./images/starfield3.png", undefined,
            function () {
                var material = new THREE.MeshLambertMaterial({
                  map: texture  
                });
                mesh.material = material;
            },
             function (e) {
                    console.log("error loading ./images/starfield3.png");
                }
            );
    },
    setUpWall: function (mesh, that, physicsWorld) {
        // material

        var texture = THREE.ImageUtils.loadTexture("./images/concrete.png", null, function () {
                var material = new THREE.MeshLambertMaterial({
                    map: texture,
                    bumpMap: texture,
                    bumpScale: 0.01,
                    specularMap : texture,
                    emmissive: 0xCCCCCC
                });
                mesh.material = material;
                that.physicsBodies[mesh.name] = AmmoPhysicsHelper.CreateStaticBox(mesh, physicsWorld);
                that.physicsBodies[mesh.name].affectedByPhysics = false;
            },
            function (e) {
                console.log("error loading ./images/concrete.png");
            }
        );        
    },
      getRandomColor : function() {
            var letters = '0123456789ABCDEF'.split('');
            var color = '#';
            for (var i = 0; i < 6; i++ ) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            //console.log("color = " + color);
            return color;
        }
};

SoccerField.prototype = SoccerFieldProto;


