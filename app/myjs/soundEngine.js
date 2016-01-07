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