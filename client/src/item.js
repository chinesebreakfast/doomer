const itemTypes = {
    "rifle": 
    {
        model: "rifle.glb", gun: true, damage: 2, 
        texture: false
    },
    "tool":  
    {
        model: "tool.glb", gun: false, damage: 1, 
        texture: false, scale: 0.1
    },
    "gauntlet": 
    {
        model: "gauntlet.glb", gun: false, 
        damage: 3, texture: false
    }
};

class Item{

    type = null;

    constructor(scene, options = {}){
        this.type = options.type;
        this.scale = options.scale;
        this.position = options.position;
        this.scene = scene;
        this.animations = [];
        this.model;
    }

async spawnItem() {
        const props = itemTypes[this.type];

        // Ждём загрузки модели
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "", 
            "./public/models/items/", 
            props.model, 
            this.scene
        );
        

        const mesh = result.meshes[0];
        mesh.position = this.position.clone();
        mesh.itemProps = props;
        mesh.scaling = new BABYLON.Vector3(this.scale, this.scale, this.scale);

        // ССЫЛКИ
        this.model = mesh;
        mesh.itemInstance = this;
        console.log("Предмет создан:", this.type, "коллизии:", mesh.checkCollisions);

         //Добавляем текстуру, если указано
        if (props.texture) {
            const material = new BABYLON.StandardMaterial(this.type + "_mat", this.scene);
            const tex = new BABYLON.Texture("./public/items/" + this.type + ".png", this.scene);
            material.backFaceCulling = false;
            material.diffuseTexture = tex;
            mesh.material = material;
        }

        result.meshes.forEach(m => {
            m.checkCollisions = true;
            m.isPickable = true;
        });

        // Останавливаем все анимации, если они есть
        if (result.animationGroups && result.animationGroups.length > 0) {
            this.animations = result.animationGroups;
            this.animations.forEach(a => a.stop());
        }
        return mesh;
    }

    playAnimation(name){
        if(!this.animations ||
            this.animations.length === 0) return;
        const anim = this.animations.find(a => a.name === name);
        if(anim){
            anim.play(false);
        }else{
            console.warn("Анимация не найдена:", this.type, name);
        }
    }
}