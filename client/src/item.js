const itemTypes = {
    "rifle": {model: "rifle.glb", gun: true, damage: 2, texture: false},
    "tool":  {model: "tool.glb", gun: false, damage: 1, texture: false},
    "gauntlet": {model: "gauntlet.glb", gun: false, damage: 3, texture: false}
};

class Item{

    constructor(scene, options = {}){
        this.type = options.type;
        this.scale = options.scale;
        this.position = options.position;
        this.scene = scene;
    }

    spawnItem() {
        const props = itemTypes[this.type];
        BABYLON.SceneLoader.ImportMeshAsync("", "./public/models/items/", props.model, this.scene)
        .then(result => {
            const mesh = result.meshes[0];
            mesh.position = this.position.clone();
            mesh.isPickable = true;
            mesh.itemProps = props; // сохраняем свойства прямо в меш
            mesh.scaling = new BABYLON.Vector3(this.scale, this.scale, this.scale);
            mesh.checkCollisions = true;
            mesh.animations = [];
            if(props.texture){
                const material = new BABYLON.StandardMaterial(
                    type + "_mat", this.scene);
                const tex = new BABYLON.Texture(
                    "./public/models/items/" + type + ".png", this.scene);
                material.backFaceCulling = false;
                material.diffuseTexture = tex;
                mesh.material = material; 
            }
            if(result.animationGroups && result.animationGroups.length > 0){
                mesh.animations = result.animationGroups;
                mesh.animations[0].play(false);
            }
        });
    }
}