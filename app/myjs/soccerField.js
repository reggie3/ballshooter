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


